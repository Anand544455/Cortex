const { google } = require('googleapis');
const { getAuthenticatedClient } = require('./googleOAuth');

/**
 * GTM's API is free. The genuinely useful automation here: instead of
 * a human manually clicking through GTM's UI to set up a GA4
 * Configuration tag, CORTEX can create it directly via the API once
 * you've connected both GA4 and GTM for a site.
 */
async function getClient(siteId) {
  const auth = await getAuthenticatedClient(siteId, 'google_tag_manager');
  return google.tagmanager({ version: 'v2', auth });
}

/**
 * Lists every GTM account + container this connected account can see -
 * used right after connecting so the user can pick which container
 * matches this CORTEX site.
 */
async function listContainers(siteId) {
  const tagmanager = await getClient(siteId);
  const { data: accountsData } = await tagmanager.accounts.list();

  const containers = [];
  for (const account of accountsData.account || []) {
    const { data: containersData } = await tagmanager.accounts.containers.list({ parent: account.path });
    (containersData.container || []).forEach((c) => {
      containers.push({
        accountId: account.accountId,
        containerId: c.containerId,
        containerPath: c.path,
        name: c.name,
        publicId: c.publicId,
      });
    });
  }
  return containers;
}

/**
 * Lists tags already configured in a container - a quick health check
 * ("do you even have a GA4 tag firing on this site at all?").
 */
async function listTags(siteId, containerPath) {
  const tagmanager = await getClient(siteId);
  const { data: workspaces } = await tagmanager.accounts.containers.workspaces.list({ parent: containerPath });
  const defaultWorkspace = workspaces.workspace?.[0];
  if (!defaultWorkspace) return [];

  const { data } = await tagmanager.accounts.containers.workspaces.tags.list({ parent: defaultWorkspace.path });
  return (data.tag || []).map((t) => ({ tagId: t.tagId, name: t.name, type: t.type, paused: t.paused || false }));
}

/**
 * Creates a basic GA4 Configuration tag firing on All Pages - the
 * single most common manual GTM setup step, automated. Still requires
 * the user to publish the workspace version themselves in GTM's UI
 * (publishing is a deliberate, reviewable action we don't want to take
 * unattended on someone's live site).
 */
async function createGa4ConfigTag(siteId, containerPath, measurementId) {
  const tagmanager = await getClient(siteId);
  const { data: workspaces } = await tagmanager.accounts.containers.workspaces.list({ parent: containerPath });
  const defaultWorkspace = workspaces.workspace?.[0];
  if (!defaultWorkspace) throw new Error('No workspace found in this GTM container.');

  const { data: triggers } = await tagmanager.accounts.containers.workspaces.triggers.list({ parent: defaultWorkspace.path });
  let allPagesTrigger = triggers.trigger?.find((t) => t.name === 'All Pages' || t.type === 'pageview');

  if (!allPagesTrigger) {
    const { data: created } = await tagmanager.accounts.containers.workspaces.triggers.create({
      parent: defaultWorkspace.path,
      requestBody: { name: 'All Pages (CORTEX)', type: 'pageview' },
    });
    allPagesTrigger = created;
  }

  const { data: tag } = await tagmanager.accounts.containers.workspaces.tags.create({
    parent: defaultWorkspace.path,
    requestBody: {
      name: 'GA4 Configuration (CORTEX)',
      type: 'gaawc',
      parameter: [{ type: 'template', key: 'measurementId', value: measurementId }],
      firingTriggerId: [allPagesTrigger.triggerId],
    },
  });

  return { tagId: tag.tagId, name: tag.name, note: 'Created but not published - review and publish this version in GTM yourself.' };
}

module.exports = { listContainers, listTags, createGa4ConfigTag };
