/*
  TODO: Implement conflict resolution for out of sync files. Follow these notes for conflict resolution
    - Default conflict resolution tries to minimize conflicts with downstream users
    - Replace local files with remote files if they have a more recent updated time
    - Users have more control of their local. They can always undo something done locally but it may be hard to do that on the cloud.
  TODO: Implement sync on network connected. So far there is only a one way sync (local -> remote)
    - Get the time the system was synced last from repository.
    - Fetch all updates that occurred after that.
    - Go through sync queue to update remote files.
  TODO: Implement sync on engine start. If the engine ever turned off local may be out of sync with remote.
    - Get the time the system was synced last from repository.
    - Fetch all updates that occurred after that.
    - Go through all the files locally that were updated after sync and push them to remote.
  TODO: Add better error handling.
    - A few of the AirSDK methods will throw if things don't exist. This code does not handle that gracefully
    - You can make use of error types. Error types should make it easier to communicate to the user and improve functionality.
    - Ex: FileNotFound when trying to delete a file can mark a success.
  TODO: Store the last time the engine synced in repository and the date of the most recent file synced.
    - This will be used to help reduce load when we need to re sync after a connection failure or engine restart.
*/
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
    //TODO: Add onAssetMoved event which is critical for engine.
    this.airSDK.onNetworkConnected(this.processFileSyncQueue);
  }

  /*
    TODO:
    - Check to see if the file already exists in the cloud
    - If file exists on cloud replace local file with the remote file and prompt user
    - If file does not exist, create file
  */
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

  /*
    TODO:
    - Check to see if the file already exists in the cloud
    - If file exists and has a more recent updated timestamp. Download that file and prompt user.
    - If file exists and does not have a more recent timestamp, delete file
    - If file does not exist, return
  */
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

  /*
    TODO:
    - Check to see if the file already exists in the cloud
    - If file does not exist, create a new file.
    - If file exists and has a more recent updated timestamp. Update local to remote file contents
    - If file exists and does not have a more recent timestamp, update remote file
  */
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

  /*
    TODO:
    - Check to see if a source and target file exist in cloud.
    - If target and source file do not exist, create a new file at target path.
    - If source file exists and target file does not, update file path
    - If target exists don't let user update if if has a more recent updated time, download remote file
  */
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

  /*
    TODO:
      - Update file sync to merge multiple actions on same file together.
      - Ex: (file create -> file update -> file delete) Should collapse to file delete
  */
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
