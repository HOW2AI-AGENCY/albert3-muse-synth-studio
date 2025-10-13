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
  Mic2,
  Volume2,
  VolumeX,
  Volume1,
  FileAudio,
  Wand2,
  Sparkles,
  Radio,
  Disc,
  Flame,
  Droplet,
  Wind,
  Sun,
  Moon,
  Cloud
} from 'lucide-react';

// Player Controls
export {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Star,
  Split
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
  MoreVertical,
  Menu,
  Search,
  Settings,
  SlidersHorizontal,
  Sliders,
  Eye,
  EyeOff,
  Palette,
  Square
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
  AlertCircle,
  Edit2
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
  Expand,
  Share2,
  Info,
  Clock,
  Calendar,
  CalendarClock,
  Globe,
  GitBranch,
  ArrowLeftRight,
  RefreshCcw,
  Grid3X3,
  SortAsc,
  SortDesc,
  Headphones,
  Library,
  Mail,
  Shield,
  Database,
  UserPlus
} from 'lucide-react';

// Charts & Analytics
export {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  BarChart3,
  Activity,
  Coins,
  HelpCircle,
  CreditCard,
  PieChart
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
