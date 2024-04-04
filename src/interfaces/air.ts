// An SDK for interacting with the Air backend.
//
// This exposes event handlers and methods for managing assets which
// which are entities with associated to a digital file stored in Air.
interface AirSDK {
  onNetworkConnected: (callback: () => void) => void;
  onNetworkDisconnected: (callback: () => void) => void;
  hasNetworkConnection: () => boolean;

  // cloud-originating events
  // delivery guarantee: at-least once
  // ordering guarantee: none
  onAssetCreated: (
    callback: (asset: {
      id: string;
      path: string;
      createdAt: Date;
      url: string;
    }) => void
  ) => void;
  onAssetUpdated: (
    callback: (asset: { id: string; path: string; updatedAt: Date }) => void
  ) => void;
  onAssetDeleted: (
    callback: (asset: {
      id: string;
      path: string;
      updatedAt: Date;
      url: string;
    }) => void
  ) => void;
  getAsset: (id: string) => Promise<{
    id: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    url: string;
  }>;
  listAssets: (args: {
    sort: {
      field: "updatedAt";
      direction: "asc" | "desc";
    };
    changedSince?: Date;
    limit?: number;
  }) => Promise<{
    data: {
      id: string;
      path: string;
      createdAt: Date;
      updatedAt: Date;
      url: string;
    }[];
    pagination: {
      hasMore: boolean;
      cursor?: string;
    };
  }>;
  createAsset: (args: { path: string; data: Buffer }) => Promise<{
    id: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    url: string;
  }>;
  updateAsset: (args: { id: string; path: string }) => Promise<void>;
  updateAssetData: (args: { id: string; data: Buffer }) => Promise<void>;
  downloadAssetData: (id: string) => Promise<Buffer>;
  deleteAsset: (id: string) => Promise<void>;

  updateAssetByPath: (args: {
    sourcePath: string;
    targetPath: string;
  }) => Promise<void>;
  updateAssetDataByPath: (args: {
    path: string;
    data: Buffer;
  }) => Promise<void>;
}
