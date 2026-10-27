export type RootStackParamList = {
  Chat: undefined;
  Drawer: undefined;
  Settings: undefined;
  Personalization: undefined;
  Server: undefined;
  /** `uri` is optional: without it the editor asks the user to pick a photo first. */
  PhotoEditor: { uri?: string } | undefined;
};
