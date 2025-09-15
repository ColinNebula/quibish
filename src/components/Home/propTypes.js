import PropTypes from 'prop-types';

// Message shape validation
export const MessageShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  text: PropTypes.string.isRequired,
  sender: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['text', 'image', 'file', 'voice', 'system']),
  status: PropTypes.oneOf(['sending', 'sent', 'delivered', 'read', 'failed']),
  isOwn: PropTypes.bool,
  file: PropTypes.shape({
    name: PropTypes.string,
    size: PropTypes.number,
    type: PropTypes.string,
    url: PropTypes.string
  }),
  reactions: PropTypes.arrayOf(PropTypes.shape({
    emoji: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired
  })),
  replyTo: PropTypes.object
});

// User shape validation
export const UserShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string.isRequired,
  username: PropTypes.string,
  avatar: PropTypes.string,
  initials: PropTypes.string,
  status: PropTypes.oneOf(['online', 'away', 'offline']),
  lastSeen: PropTypes.string
});

// Status update shape validation
export const StatusShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  user: PropTypes.string.isRequired,
  initials: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  timestamp: PropTypes.string.isRequired,
  seen: PropTypes.bool
});

// Category shape validation
export const CategoryShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired
});

// Component prop type definitions
export const HomeComponentPropTypes = {
  user: UserShape.isRequired,
  onLogout: PropTypes.func.isRequired
};

export const AppHeaderPropTypes = {
  user: UserShape.isRequired,
  userInitials: PropTypes.string.isRequired,
  userAvatarColor: PropTypes.string.isRequired,
  connectionStatus: PropTypes.string.isRequired,
  connectionText: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
  onToggleTheme: PropTypes.func.isRequired,
  onToggleSidebar: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export const AppSidebarPropTypes = {
  collapsed: PropTypes.bool.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(CategoryShape).isRequired,
  statusUpdates: PropTypes.arrayOf(StatusShape).isRequired,
  onCreateStatus: PropTypes.func.isRequired
};

export const StatusBarPropTypes = {
  statusUpdates: PropTypes.arrayOf(StatusShape).isRequired,
  onCreateStatus: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export const MessageListPropTypes = {
  messageGroups: PropTypes.object.isRequired,
  onReply: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  searchQuery: PropTypes.string
};

export const MessageItemPropTypes = {
  message: MessageShape.isRequired,
  onReply: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  searchQuery: PropTypes.string
};

export const InputAreaPropTypes = {
  currentMessage: PropTypes.string.isRequired,
  onMessageChange: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  onEmojiToggle: PropTypes.func.isRequired,
  replyToMessage: MessageShape,
  onCancelReply: PropTypes.func.isRequired,
  isUploading: PropTypes.bool.isRequired,
  uploadProgress: PropTypes.number.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export const EmptyStatePropTypes = {
  category: PropTypes.string.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onClearSearch: PropTypes.func.isRequired,
  onResetFilters: PropTypes.func.isRequired
};

export const EmojiPickerPropTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  emojis: PropTypes.arrayOf(PropTypes.string).isRequired
};

export const StatusModalPropTypes = {
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

// Default props
export const HomeComponentDefaultProps = {
  user: {
    id: 1,
    name: 'Anonymous User',
    username: 'anonymous',
    avatar: null,
    status: 'online'
  }
};

export const MessageItemDefaultProps = {
  searchQuery: ''
};

export const InputAreaDefaultProps = {
  replyToMessage: null
};

export const EmptyStateDefaultProps = {
  category: 'all',
  searchQuery: ''
};