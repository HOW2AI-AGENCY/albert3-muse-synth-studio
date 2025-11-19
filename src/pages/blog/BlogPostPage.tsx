/**
 * Blog Post Detail Page
 */
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useBlogPost } from '@/hooks/useBlog';
import { Skeleton } from '@/components/ui/skeleton';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useBlogPost(slug!);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!post) return <div>Статья не найдена</div>;

  return (
    <>
      <Helmet>
        <title>{post.seo_title || post.title} | Albert3 Blog</title>
        <meta name="description" content={post.seo_description || post.excerpt} />
      </Helmet>
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  );
}
