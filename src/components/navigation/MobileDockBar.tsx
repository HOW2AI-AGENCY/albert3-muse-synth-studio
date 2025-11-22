import { useNavigate } from 'react-router-dom'
import { FolderKanban, Mic2, Library, Plus } from 'lucide-react'
import { HapticButton } from '@/components/ui/HapticButton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useBreakpoints } from '@/hooks/useBreakpoints'

const MobileDockBar: React.FC = () => {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoints()
  if (!isMobile) return null
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-bottom-nav',
      'bg-background/90 backdrop-blur-xl border-t border-border/50',
      'pt-2 pb-6 pb-safe'
    )}>
      <div className="flex justify-around items-center">
        <HapticButton aria-label="Projects" variant="ghost" size="sm" className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/workspace/projects')}>
          <FolderKanban className="w-5 h-5" />
          <span className="text-[10px] font-medium">Projects</span>
        </HapticButton>
        <HapticButton aria-label="Artists" variant="ghost" size="sm" className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/workspace/personas')}>
          <Mic2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Artists</span>
        </HapticButton>
        <div className="relative -top-6">
          <HapticButton aria-label="Create" variant="glow" size="lg" className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_8px_20px_rgba(79,70,229,0.4)] text-white border-[4px] border-background" onClick={() => navigate('/workspace/generate')}>
            <Plus className="w-6 h-6" />
          </HapticButton>
        </div>
        <HapticButton aria-label="Library" variant="ghost" size="sm" className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/workspace/library')}>
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-medium">Library</span>
        </HapticButton>
        <HapticButton aria-label="Profile" variant="ghost" size="sm" className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/workspace/profile')}>
          <div className="w-5 h-5 rounded-full overflow-hidden border">
            <Avatar className="h-5 w-5">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </HapticButton>
      </div>
      <div className="w-32 h-1 bg-muted rounded-full mx-auto mt-2"></div>
    </div>
  )
}

export default MobileDockBar