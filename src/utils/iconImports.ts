/**
 * Centralized Icon Imports - Tree-shaking optimization
 * 
 * CRITICAL: Импортируем ТОЛЬКО используемые иконки из lucide-react
 * Это уменьшает bundle size с ~700KB до ~50KB
 */

// Authentication & User
export { 
  Loader2,
  User,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Home
} from 'lucide-react';

// Music & Audio
export {
  Music,
  Music2,
  Music4,
  Mic,
  Volume2,
  VolumeX,
  Volume1,
  FileAudio,
  Wand2,
  Sparkles
} from 'lucide-react';

// Player Controls
export {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Star
} from 'lucide-react';

// UI Controls
export {
  X,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';

// File Operations
export {
  Upload,
  Download,
  FileText,
  Trash2,
  Copy,
  Check,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Layout & Navigation
export {
  LayoutGrid,
  List,
  ListMusic,
  Layers,
  GripVertical,
  Minimize2,
  Maximize2,
  Share2,
  Info,
  Clock,
  Calendar
} from 'lucide-react';

// Charts & Analytics
export {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

// Social & Actions
export {
  Heart,
  MessageCircle,
  Send,
  Bell,
  BellOff
} from 'lucide-react';

// Type exports
export type { LucideIcon } from 'lucide-react';
