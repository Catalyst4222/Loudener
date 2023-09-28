import { Store } from "replugged/dist/renderer/modules/common/flux";

type UserID = string;

interface MediaEngineSettings {
  localMutes: Record<UserID, boolean>;
  localVolumes: Record<UserID, number>;

  // Self options
  mute: boolean;
  deaf: boolean;
}

interface State {
  settingsByContext: Record<string, MediaEngineSettings>;
}

export interface MediaEngineStoreType extends Store {
  getState(): State;
  getSettings(): MediaEngineSettings;
}

export interface MenuControlItemProps {
  id: string;
  label?: string;
  control: (
    data: {
      onClose: () => void;
      disabled: boolean;
      isFocused: boolean;
    },
    ref?: React.Ref<{
      activate: () => boolean;
      blur: () => void;
      focus: () => void;
    }>,
  ) => React.ReactElement;
  disabled?: boolean;
  showDefaultFocus?: boolean;
}

export interface MenuSliderControlProps {
  "aria-label": string;
  disabled: unknown | undefined;
  isFocused: boolean;
  maxValue: number;
  onChange(value: number): void;
  onClose(callback: () => void): void;
}

interface AudioContext {
  muted: boolean;
  volume: number; // between 0 and 200?
  modifiedAt: string;
  soundBoardMuted: boolean;
  // And then some symbol
}

interface AudioContextSettings {
  stream: Record<UserID, AudioContext>;
  user: Record<UserID, AudioContext>;
}

interface SettingsProto {
  audioContextSettings?: AudioContextSettings;

  // Lots of fun stuff here, todo: look into it more
  appearance?: unknown;
  debug?: unknown;
  favorites?: unknown; // Favorites server
  gameLibrary?: unknown;
  guildFolders?: unknown;
  inbox?: unknown;
  localizations?: unknown;
  notifications?: unknown;
  privacy?: unknown;
  status?: unknown;
  textAndImages?: unknown;
  userContent?: unknown;
  versions?: unknown;
  voiceAndVideo?: unknown;
  // And some symbol
}

// From the USER_SETTINGS_PROTO_UPDATE event
export interface SettingsProtoUpdateAction extends Record<string, unknown> {
  // Record<> for no ts complaints
  local: boolean;
  type: "USER_SETTINGS_PROTO_UPDATE";

  partial?: boolean;
  resendEditInfo?: boolean;

  settings: {
    type: number;
    proto: SettingsProto;
  };
}
