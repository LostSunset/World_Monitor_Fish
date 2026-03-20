import DOMPurify from 'dompurify';

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','ul','ol','li','pre','code',
                    'blockquote','strong','em','a','br','div','span','table',
                    'thead','tbody','tr','th','td','hr','img','sup','sub'],
    ALLOWED_ATTR: ['class','data-level','href','target','rel','src','alt','start'],
  });
}
