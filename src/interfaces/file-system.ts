// Event handlers and methods for managing files on the local filesystem
interface FileSystem {
  onFileCreated: (
    callback: (file: {
      path: string;
      inode: string;
      mTime: Date;
      cTime: Date;
    }) => void
  ) => void;
  onFileUpdated: (
    callback: (file: {
      path: string;
      inode: string;
      mTime: Date;
      cTime: Date;
    }) => void
  ) => void;
  onFileMoved: (
    callback: (file: {
      sourcePath: string;
      targetPath: string;
      inode: string;
      mTime: Date;
      cTime: Date;
    }) => void
  ) => void;
  onFileDeleted: (
    callback: (file: {
      path: string;
      inode: string;
      mTime: Date;
      cTime: Date;
    }) => void
  ) => void;
  getFile: (path: string) => Promise<{
    path: string;
    inode: string;
    mTime: Date;
    cTime: Date;
  }>;
  readFile: (path: string) => Promise<Buffer>;
  writeFile: (path: string, data: Buffer) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  moveFile: (sourcePath: string, targetPath: string) => Promise<void>;
  listFiles: (args: {
    sort: {
      field: "cTime";
      direction: "asc" | "desc";
    };
    changedSince?: Date;
  }) => Promise<{
    data: {
      path: string;
      inode: string;
      mTime: Date;
      cTime: Date;
    }[];
    pagination: {
      hasMore: boolean;
      cursor?: string;
    };
  }>;
}
