import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import Breadcrumbs from '@/components/Breadcrumbs';
import NotFound from '@/pages/NotFound';
import { Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  featured_image: string | null;
  meta_description: string | null;
  is_published: boolean;
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Note: 'pages' table requires migration to be applied first
        // Using type assertion until types.ts is regenerated
        const { data, error } = await (supabase as any)
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setPage(data);
          // Update document title for SEO
          document.title = `${data.title} | Tardeo`;
          
          // Update meta description if available
          if (data.meta_description) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              metaDesc.setAttribute('content', data.meta_description);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();

    // Cleanup: restore original title on unmount
    return () => {
      document.title = 'Tardeo';
    };
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header user={null} />
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Not found - render NotFound component
  if (notFound || !page) {
    return <NotFound />;
  }

  // Sanitize HTML content - allow YouTube iframes and style attributes for alignment
  const sanitizedContent = page.content 
    ? DOMPurify.sanitize(page.content, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'ul', 'ol', 'li',
          'strong', 'em', 'u', 's',
          'a', 'img',
          'blockquote', 'pre', 'code',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span',
          'iframe' // For YouTube embeds
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'class', 'target', 'rel',
          'style', // For text alignment
          'width', 'height', 'frameborder', 'allow', 'allowfullscreen', // For iframes
          'title', 'loading'
        ],
        // Only allow YouTube iframes
        ALLOWED_URI_REGEXP: /^(?:(?:https?:)?\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/|data:|blob:|\/)/i,
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
      })
    : '';

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header user={null} />
        
        <main className="container mx-auto p-6 max-w-4xl">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: page.title }
            ]}
          />

          {/* Hero Image */}
          {page.featured_image && (
            <img
              src={page.featured_image}
              alt={page.title}
              className="w-full h-64 object-cover rounded-xl mt-4"
            />
          )}

          {/* Page Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8 mt-6">
            {page.title}
          </h1>

          {/* Page Content - prose class styles all HTML elements inside */}
          <article 
            className="prose prose-lg prose-pink dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-foreground
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-lg
              prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-muted-foreground prose-li:marker:text-primary
              prose-strong:text-foreground
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-hr:border-border
              [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-xl [&_iframe]:my-6
            "
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </main>
      </div>
    </PageTransition>
  );
}
