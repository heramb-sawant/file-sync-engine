# file-sync-engine

An Engine to sync Local Files to an Air Cloud. This file system should sync a file system across multiple users onto a single source on the cloud.

## Implementation

The sync engine should be able to handle file syncing even when there is no connection to the cloud and changes have been made while the engine is not running. There are three major use case.

1. Engine is running with a stable cloud connection.
2. Engine is running with no cloud connection.
3. Engine is not running and no cloud connection.

For now the engine is not very complicated. It just writes any changes made locally to remote and vice versa. However, I want to get it to a point where the engine assumes that remote files always take precedence to local files. It is much easier for a user to revert their changes than it is to push bad data remote and hard all the users downstream. When creating, updating or deleting a file, its safe to assume that your local file will be rewritten to the remote file if anything goes wrong.

\*Use case 2 and 3 are still not complete. See comments in code for more information

## Running locally

Under Construction

## Testing

Under Construction
