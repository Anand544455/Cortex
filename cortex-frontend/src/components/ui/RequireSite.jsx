import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { EmptyState } from './DataDisplay';
import Button from './Button';

export default function RequireSite({ children, siteId, sitesLoading }) {
  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate text-sm">Loading your sites…</div>
    );
  }

  if (!siteId) {
    return (
      <div className="bg-white border border-slate/15 rounded-card shadow-card">
        <EmptyState
          icon={Globe}
          message="No site selected"
          hint="Add a website to this workspace to unlock every module — crawling, keywords, backlinks, and everything else are all scoped to one site at a time."
        />
        <div className="flex justify-center pb-8">
          <Link to="/sites">
            <Button>Go to All Sites</Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
