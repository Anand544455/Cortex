import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { siteApi } from '../api/sites';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('cortex_workspace_id') || null);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(localStorage.getItem('cortex_site_id') || null);
  const [sitesLoading, setSitesLoading] = useState(false);

  useEffect(() => {
    if (user?.workspaces?.length && !workspaceId) {
      selectWorkspace(user.workspaces[0].id);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSites = useCallback(async (wsId) => {
    const id = wsId || workspaceId;
    if (!id) return;
    setSitesLoading(true);
    try {
      const { data } = await siteApi.list(id);
      setSites(data.data.sites || []);
      if (!siteId && data.data.sites?.length) {
        selectSite(data.data.sites[0].id);
      }
    } finally {
      setSitesLoading(false);
    }
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (workspaceId) refreshSites(workspaceId);
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectWorkspace(id) {
    setWorkspaceId(id);
    localStorage.setItem('cortex_workspace_id', id);
    setSiteId(null);
    setSites([]);
  }

  function selectSite(id) {
    setSiteId(id);
    localStorage.setItem('cortex_site_id', id);
  }

  const currentSite = sites.find((s) => s.id === siteId) || null;
  const currentWorkspace = user?.workspaces?.find((w) => w.id === workspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId,
        selectWorkspace,
        workspaces: user?.workspaces || [],
        currentWorkspace,
        sites,
        sitesLoading,
        siteId,
        selectSite,
        currentSite,
        refreshSites,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
