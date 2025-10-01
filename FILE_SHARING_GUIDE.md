# Advanced File Sharing System Documentation

## Overview

The Advanced File Sharing System is a comprehensive solution for uploading, managing, and sharing files within Quibish conversations. It features drag-and-drop uploads, real-time progress tracking, file previews, and organized file management.

## Features

### 📤 File Upload
- **Drag & Drop Interface**: Simply drag files into the upload area
- **Multiple File Support**: Upload multiple files simultaneously
- **Real-time Progress**: Visual progress bars for each upload
- **File Validation**: Automatic validation of file size and type
- **Max File Size**: 100MB per file
- **Thumbnail Generation**: Automatic thumbnails for images and videos

### 📁 Supported File Types
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, WebM, OGG
- **Audio**: MP3, WAV, OGG, WebM
- **Documents**: PDF, Word, Excel, PowerPoint, TXT, CSV
- **Archives**: ZIP, RAR, 7Z

### 🔍 File Management
- **Category Filters**: Filter by images, videos, documents, audio
- **Search Functionality**: Search files by name, description, or tags
- **Bulk Operations**: Select and delete multiple files at once
- **File Details**: View file size, upload date, and metadata
- **Download Files**: Download any file to your device
- **Delete Files**: Remove unwanted files with confirmation

### 👁️ File Preview
- **Image Preview**: Full-screen image viewing
- **Video Player**: Built-in video playback controls
- **Audio Player**: Audio playback with controls
- **PDF Viewer**: In-browser PDF viewing
- **Text Files**: Text file preview
- **Generic Preview**: Download option for unsupported types

### 💾 Storage & Persistence
- **IndexedDB Storage**: Files stored locally in your browser
- **Persistent Data**: Files remain across page reloads
- **Conversation Isolation**: Files organized by conversation
- **User Files**: Access all your uploaded files

## User Interface

### File Share Button
Located in the chat header (📎 icon), click to open the file sharing panel.

### Upload Area
- **Click or Drag**: Click the upload area or drag files onto it
- **Visual Feedback**: Highlights when dragging files
- **Multiple Files**: Upload as many files as needed

### File Grid
- **Grid Layout**: Files displayed in an organized grid
- **Thumbnails**: Visual previews for images and videos
- **Icons**: Category-based icons for other file types
- **Quick Actions**: Download and delete buttons on each file

### Filter Tabs
- **All**: Show all files
- **🖼️ Images**: Filter to images only
- **🎥 Videos**: Filter to videos only
- **📄 Docs**: Filter to documents only
- **🎵 Audio**: Filter to audio files only

### Search Box
Type to search files by name, description, or tags in real-time.

### Bulk Actions
- Select multiple files using checkboxes
- Delete multiple files at once
- Clear selection easily

## Technical Details

### Service Architecture

#### FileShareService (`fileShareService.js`)
- Singleton service managing all file operations
- IndexedDB integration for persistence
- Event system for real-time updates
- File validation and security checks
- Thumbnail generation for media files

#### Key Methods:
- `uploadFile(file, options)` - Upload single file
- `uploadFiles(files, options)` - Upload multiple files
- `downloadFile(fileId)` - Download file to device
- `getFile(fileId)` - Get file metadata
- `getUserFiles(userId)` - Get all files for user
- `getConversationFiles(conversationId)` - Get files for conversation
- `searchFiles(query)` - Search files by query
- `deleteFile(fileId)` - Delete file and data
- `getFileBlob(fileId)` - Get file blob for preview

### Components

#### FileSharePanel (`FileSharePanel.js`)
- Main panel for file management
- Drag-and-drop upload area
- File list with grid layout
- Filter and search controls
- Bulk selection and actions
- Real-time upload progress

#### FilePreview (`FilePreview.js`)
- Modal for file preview
- Media player for videos/audio
- Image viewer with full-screen
- PDF and text file viewer
- Download and delete actions
- File metadata display

### Database Schema

#### IndexedDB: `QuibishFileShare`

**Files Store:**
```javascript
{
  id: 'file_timestamp_random',
  name: 'filename.jpg',
  size: 1024000,
  type: 'image/jpeg',
  category: 'images',
  uploadDate: '2025-10-01T12:00:00Z',
  userId: 'user1',
  conversationId: 'conv1',
  description: 'Optional description',
  tags: ['tag1', 'tag2'],
  thumbnail: 'data:image/jpeg;base64,...',
  status: 'completed'
}
```

**FileChunks Store:**
```javascript
{
  id: 'fileId_data',
  fileId: 'file_timestamp_random',
  data: ArrayBuffer
}
```

**SharedFiles Store:**
```javascript
{
  id: 'share_timestamp_random',
  fileId: 'file_timestamp_random',
  sharedWith: 'user2'
}
```

### Events

The service emits the following events:
- `onUploadProgress` - Upload progress updates
- `onUploadComplete` - Upload finished successfully
- `onUploadError` - Upload failed
- `onDownloadProgress` - Download progress updates
- `onDownloadComplete` - Download finished
- `onFileDeleted` - File deleted
- `onFileShared` - File shared with another user

### Security Features

1. **File Type Validation**: Only allowed file types can be uploaded
2. **File Size Limits**: 100MB maximum per file
3. **Filename Sanitization**: Only safe characters allowed
4. **MIME Type Checking**: Validates actual file type
5. **Secure Storage**: Files stored in browser's IndexedDB

## Usage Examples

### Opening File Share Panel
Click the 📎 button in the chat header to open the panel.

### Uploading Files
1. Click the upload area or drag files onto it
2. Select one or more files
3. Watch the progress bars as files upload
4. Files appear in the grid when complete

### Viewing Files
1. Click on any file in the grid
2. File preview opens in a modal
3. Use controls to play media or scroll documents
4. Close with the ✕ button

### Downloading Files
1. Click the ⬇️ button on a file
2. File downloads to your device
3. Or click the Download button in preview

### Deleting Files
1. Click the 🗑️ button on a file
2. Confirm deletion in the dialog
3. File and data are permanently removed

### Bulk Operations
1. Check the boxes on multiple files
2. Click "Delete Selected" to remove all
3. Or "Clear Selection" to uncheck all

### Searching Files
1. Type in the search box
2. Results filter in real-time
3. Search by name, description, or tags

### Filtering by Category
1. Click a category tab (Images, Videos, etc.)
2. Only files of that type are shown
3. Click "All" to show everything

## Performance Considerations

- **Chunked Uploads**: Large files uploaded in 64KB chunks
- **Lazy Loading**: Thumbnails generated on-demand
- **Efficient Storage**: Files compressed when possible
- **Memory Management**: Blob URLs cleaned up properly
- **Indexed Searches**: Fast lookups using IndexedDB indexes

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 13+)
- **Mobile Browsers**: Full support with touch optimization

## Size Impact

- **JavaScript Bundle**: +4.75 KB (gzipped)
- **CSS Bundle**: +1.76 KB (gzipped)
- **Total Impact**: ~6.5 KB additional size

## Future Enhancements

Planned features for future releases:
- File compression before upload
- Batch download as ZIP
- File sharing links
- File expiry dates
- Storage quotas per user
- Cloud sync integration
- Real-time collaboration
- File versioning
- Advanced permissions

## Troubleshooting

### Upload Fails
- Check file size (max 100MB)
- Verify file type is supported
- Ensure browser has storage space
- Check browser console for errors

### Preview Not Working
- Verify file uploaded completely
- Check browser supports file type
- Try downloading and opening locally
- Clear browser cache and retry

### Files Not Persisting
- Check IndexedDB is enabled in browser
- Ensure not in private/incognito mode
- Verify storage quota not exceeded
- Check browser console for errors

## Support

For issues or questions:
1. Check browser console for errors
2. Verify file meets requirements
3. Try in different browser
4. Contact support with details

---

**Version**: 1.0.0  
**Last Updated**: October 1, 2025  
**Component Status**: ✅ Production Ready
