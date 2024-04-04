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
  }

  private handleFileCreated = async (file: { path: string }) => {
    const { path } = file;

    try {
      const fileBuffer = await this.fileSystem.readFile(path);

      return this.airSDK.createAsset({ path: file.path, data: fileBuffer });
    } catch (error) {
      throw new Error("handleFileCreated: An error occurred on file creation.");
    }
  };

  private handleFileDeleted = async (file: { path: string }) => {
    const { path } = file;

    try {
      return this.airSDK.deleteAsset(path);
    } catch (error) {
      throw new Error("handleFileDeleted: An error occurred on file deletion.");
    }
  };

  private handleFileUpdated = async (file: { path: string }) => {
    const { path } = file;

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
      throw new Error();
    }
  };
}
