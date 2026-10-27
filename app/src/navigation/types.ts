export type RootStackParamList = {
  Chat: undefined;
  Conversations: undefined;
  Settings: undefined;
  /** `uri` is optional: without it the editor asks the user to pick a photo first. */
  PhotoEditor: { uri?: string } | undefined;
};
