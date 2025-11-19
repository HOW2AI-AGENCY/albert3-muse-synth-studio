/**
 * Blog Post Card Component
 */
import { Link } from 'react-router-dom';
import { Clock, Heart, MessageCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url?: string;
  published_at: string;
  reading_time_minutes: number;
  like_count: number;
  comment_count: number;
  tags: string[];
  is_featured: boolean;
  category_id?: string;
}

interface BlogPostCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  return (
    <Link to={`/blog/${post.slug}`}>
      <Card 
        className={cn(
          "group hover:shadow-xl transition-all duration-300 overflow-hidden h-full",
          featured && "md:col-span-2 lg:col-span-3"
        )}
      >
        {post.cover_image_url && (
          <div className={cn(
            "relative overflow-hidden",
            featured ? "h-64 md:h-96" : "h-48"
          )}>
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {post.is_featured && (
              <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm">
                Рекомендуем
              </Badge>
            )}
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true, locale: ru })}
          </div>
          
          <h3 className={cn(
            "font-bold group-hover:text-primary transition-colors line-clamp-2",
            featured ? "text-2xl md:text-3xl" : "text-xl"
          )}>
            {post.title}
          </h3>
        </CardHeader>

        <CardContent className="pb-3">
          <p className={cn(
            "text-muted-foreground line-clamp-3",
            featured ? "text-base" : "text-sm"
          )}>
            {post.excerpt}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.reading_time_minutes} мин
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {post.like_count}
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.comment_count}
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
