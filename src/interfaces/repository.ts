enum SyncType {
  "CREATE",
  "DELETE",
  "UPDATE",
  "MOVE",
}
interface Repository {
  addToFileSyncQueue: (action: {
    type: SyncType;
    path: string;
    // TODO: Create multiple input types instead of just this optional
    targetPath?: string;
  }) => void;
  removeFromFileSyncQueue: (id: string) => void;
  getFileSyncQueue: () => {
    id: string;
    type: SyncType;
    path: string;
    targetPath?: string;
  }[];
}
