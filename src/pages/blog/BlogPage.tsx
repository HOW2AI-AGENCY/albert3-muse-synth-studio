/**
 * Blog Page - List of articles
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { BlogCategoryFilter } from '@/components/blog/BlogCategoryFilter';
import { useBlogPosts, useBlogCategories } from '@/hooks/useBlog';
import { Skeleton } from '@/components/ui/skeleton';

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  const { data: categories, isLoading: categoriesLoading } = useBlogCategories();
  const { data: posts, isLoading: postsLoading } = useBlogPosts({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery,
    sortBy,
  });

  return (
    <>
      <Helmet>
        <title>Блог | Albert3 Muse Synth Studio</title>
        <meta name="description" content="Статьи, туториалы и новости о создании музыки с AI" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Блог
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Узнайте больше о создании музыки с помощью AI, последние новости и советы от экспертов
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск статей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'popular')}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Сначала новые</SelectItem>
                <SelectItem value="popular">Популярные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categories */}
          {categoriesLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
          ) : (
            <BlogCategoryFilter
              categories={categories || []}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}
        </div>

        {/* Posts Grid */}
        {postsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Статьи не найдены</p>
          </div>
        )}
      </div>
    </>
  );
}
