import { Injector, Logger, common, types, util, webpack } from "replugged";
import {
  MediaEngineStoreType,
  MenuControlItemProps,
  MenuSliderControlProps,
  SettingsProtoUpdateAction,
} from "./types";

const { lodash: _ } = common;
const { ContextMenuTypes } = types;
const { findInReactTree } = util;

const inject = new Injector();
const logger = Logger.plugin("PluginTemplate");

const MediaEngineStore = webpack.getByStoreName<MediaEngineStoreType>("MediaEngineStore")!;


export function start(): void {
  patchAudioUpdate();
  patchSettingsUpdate();
  patchVolumeSlider();
}

/**
 * Set the limit on user volumes to 500
 * todo: make it a setting
 */
function patchVolumeSlider(): void {
  const logSliderPatch = _.throttle(logger.log, 1000)

  inject.utils.addMenuItem(ContextMenuTypes.UserContext, (_data, menu) => {

    // findInReactTree gives all sorts of fun typescript errors :D

    // @ts-expect-error ^above
    const userVolume: React.ReactElement<MenuControlItemProps> | undefined = findInReactTree(
      // @ts-expect-error ^above
      menu,
      // @ts-expect-error ^above 
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      (elem) => elem?.props?.id == "user-volume",
    );

    if (!userVolume) return;

    logSliderPatch("Overriding volume slider")

    const oldControl = userVolume.props.control;

    userVolume.props.control = (data, ref) => {
      const slider: React.ReactElement<MenuSliderControlProps> = oldControl(data, ref);
      slider.props.maxValue = 500;
      return slider;
    };
  });
}



/** 
 * Prevent invalid volumes being sent to the api
 * Instead, sends a value of 200 in their place
 * 200 is accepted by the api, but won't happen naturally
 */
function patchAudioUpdate(): void {
  const logAudioUpdate = _.throttle(logger.log, 1000)

  const audioHandler = MediaEngineStore._dispatcher._actionHandlers
    .getOrderedActionHandlers({ type: "AUDIO_SET_LOCAL_VOLUME" })
    .find((handler) => handler.name == "MediaEngineStore");

  if (!audioHandler) return;

  inject.instead(audioHandler, "actionHandler", (args, orig) => {
    const action = args[0]! as { volume: number; userId: string; context: "default" | "stream" };

    if (action.volume < 200) {
      orig(...args);
      return;
    }

    logAudioUpdate("Masking increased volume from the api")

    const { volume } = action;
    action.volume = 200;

    orig(...args);

    setVolume(action.context, action.userId, volume)
  });
}


/**
 * Fix values sent back from the api
 * If we get a value of 200, then we know it's supposed to be increased
 */
function patchSettingsUpdate(): void {
  const updateHandler = MediaEngineStore._dispatcher._actionHandlers
    .getOrderedActionHandlers({ type: "USER_SETTINGS_PROTO_UPDATE" })
    .find((handler) => handler.name == "MediaEngineStore");

  if (!updateHandler) return;

  inject.instead(updateHandler, "actionHandler", (args, orig) => {
    const action = args[0]! as SettingsProtoUpdateAction;
    console.log(action)
    const settings = action.settings.proto.audioContextSettings;

    if (!settings) {
      orig(...args);
      return;
    }

    logger.log("Restoring increased volumes")

    // user ids with changed audios
    const userSettings: Array<[string, number]> = Object.entries(settings.user)
      .filter(([_user, setting]) => setting.volume == 200)
      .map(([user, _setting]) => [user, getVolume("default", user)]);
    
    // stream ids with changed audios
    const streamSettings: Array<[string, number]> = Object.entries(settings.stream)
      .filter(([_stream, setting]) => setting.volume == 200)
      .map(([stream, _setting]) => [stream, getVolume("stream", stream)]);

    
    // Our settings in the MediaEngineStore get overwritten...
    orig(...args);  

    // ...so now we restore them
    userSettings.map(([user, volume]) => setVolume("default", user, volume))
    streamSettings.map(([stream, volume]) => setVolume("stream", stream, volume))
  });}


// Get the locally-stored volume
function getVolume(context: "default" | "stream", id: string): number {
  return MediaEngineStore.getState().settingsByContext[context].localVolumes[id];
}

// Set the locally-stored volume
function setVolume(context: "default" | "stream", id: string, volume: number): void {
  MediaEngineStore.getState().settingsByContext[context].localVolumes[id] = volume
}

export function stop(): void {
  inject.uninjectAll();
}
