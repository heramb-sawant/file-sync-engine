class SyncEngine {
  constructor(
    private fileSystem: FileSystem,
    private airSDK: AirSDK,
    private repository: Repository
  ) {}

  start() {
    this.fileSystem.onFileCreated(this.handleFileCreated);
    this.fileSystem.onFileDeleted(this.handleFileDeleted);
    this.fileSystem.onFileUpdated(this.handleFileUpdated);
    this.fileSystem.onFileMoved(this.handFileMoved);

    this.airSDK.onAssetCreated(this.handleAssetCreated);
    this.airSDK.onAssetDeleted(this.handleAssetDeleted);
    this.airSDK.onAssetUpdated(this.handleAssetUpdated);
    this.airSDK.onNetworkConnected(this.processFileSyncQueue);
  }

  private handleFileCreated = async (file: { path: string }) => {
    const { path } = file;

    if (!this.airSDK.hasNetworkConnection()) {
      return this.repository.addToFileSyncQueue({
        type: SyncType.CREATE,
        path: file.path,
      });
    }

    try {
      const fileBuffer = await this.fileSystem.readFile(path);

      return this.airSDK.createAsset({ path: file.path, data: fileBuffer });
    } catch (error) {
      throw new Error("handleFileCreated: An error occurred on file creation.");
    }
  };

  private handleFileDeleted = async (file: { path: string }) => {
    const { path } = file;

    if (!this.airSDK.hasNetworkConnection()) {
      return this.repository.addToFileSyncQueue({
        type: SyncType.DELETE,
        path: file.path,
      });
    }

    try {
      return this.airSDK.deleteAsset(path);
    } catch (error) {
      throw new Error("handleFileDeleted: An error occurred on file deletion.");
    }
  };

  private handleFileUpdated = async (file: { path: string }) => {
    const { path } = file;

    if (!this.airSDK.hasNetworkConnection()) {
      return this.repository.addToFileSyncQueue({
        type: SyncType.UPDATE,
        path: file.path,
      });
    }

    try {
      const fileBuffer = await this.fileSystem.readFile(path);

      return this.airSDK.updateAssetDataByPath({
        path: path,
        data: fileBuffer,
      });
    } catch (error) {
      throw new Error("handleFileUpdated: An error occurred on file update.");
    }
  };

  private handFileMoved = async (file: {
    sourcePath: string;
    targetPath: string;
  }) => {
    const { targetPath, sourcePath } = file;

    if (!this.airSDK.hasNetworkConnection()) {
      return this.repository.addToFileSyncQueue({
        type: SyncType.MOVE,
        path: file.sourcePath,
        targetPath,
      });
    }

    try {
      return this.airSDK.updateAssetByPath({
        sourcePath: sourcePath,
        targetPath: targetPath,
      });
    } catch (error) {
      throw new Error("handFileMoved: An error occurred on file move.");
    }
  };

  private handleAssetCreated = async (asset: { id: string; path: string }) => {
    try {
      const assetData = await this.airSDK.downloadAssetData(asset.id);
      return this.fileSystem.writeFile(asset.path, assetData);
    } catch (error) {
      throw new Error(
        "handleAssetCreated: An error occurred on asset creation."
      );
    }
  };

  private handleAssetDeleted = async (asset: { id: string; path: string }) => {
    try {
      return this.fileSystem.deleteFile(asset.path);
    } catch (error) {
      throw new Error(
        "handleAssetDeleted: An error occurred on asset deletion."
      );
    }
  };

  private handleAssetUpdated = async (asset: { id: string; path: string }) => {
    try {
      const assetData = await this.airSDK.downloadAssetData(asset.id);

      return this.fileSystem.writeFile(asset.path, assetData);
    } catch (error) {
      throw new Error("handleAssetUpdated: An error occurred on asset update.");
    }
  };

  private async processFileSyncQueue() {
    const queue = this.repository.getFileSyncQueue();

    while (queue.length > 0 && this.airSDK.hasNetworkConnection()) {
      for (const action of queue) {
        switch (action.type) {
          case SyncType.CREATE:
            await this.handleFileCreated({
              path: action.path,
            });
            break;
          case SyncType.DELETE:
            await this.handleFileDeleted({
              path: action.path,
            });
            break;
          case SyncType.UPDATE:
            await this.handleFileUpdated({
              path: action.path,
            });
            break;
          case SyncType.MOVE:
            if (!action.targetPath) {
              throw new Error(
                `File sync queue action id:${action.id} missing targetPath.`
              );
            }
            await this.handFileMoved({
              sourcePath: action.path,
              targetPath: action.targetPath,
            });
            break;
          default:
            throw new Error(
              `An error occurred while trying to process ${action.id} from file sync queue.`
            );
        }

        await this.repository.removeFromFileSyncQueue(action.id);
      }
    }
  }
}
