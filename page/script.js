// Global state
const dashboardData = {
  topDomains: [],
  queryTypes: [],
  blockedDomains: [],
  clients: [],
  clientQueries: [],
  selectedClient: "",
  currentPage: 1,
  loading: false,
  autoRefresh: true,
  refreshInterval: 5,
  lastUpdated: null,
};

let refreshTimer = null;

// API endpoints
const API_ENDPOINTS = {
  topDomains: "/api/top-domains",
  queryTypes: "/api/query-types",
  blockedDomains: "/api/blocked-domains",
  clients: "/api/clients",
  clientQueries: "/api/client-queries",
};

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  fetchAllData();
  setupAutoRefresh();
});

function initializeEventListeners() {
  // Tab switching
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", function () {
      switchTab(this.dataset.tab);
    });
  });

  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", fetchAllData);

  // Auto refresh controls
  document
    .getElementById("autoRefresh")
    .addEventListener("change", function () {
      dashboardData.autoRefresh = this.checked;
      setupAutoRefresh();
    });

  document
    .getElementById("refreshInterval")
    .addEventListener("change", function () {
      dashboardData.refreshInterval = Number.parseInt(this.value);
      setupAutoRefresh();
    });

  // Modal controls
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeModal);
  document
    .getElementById("copyCommand")
    .addEventListener("click", copyToClipboard);

  // Close modal on outside click
  document
    .getElementById("unblockModal")
    .addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active", "text-blue-600", "border-blue-500");
    button.classList.add("text-gray-500", "border-transparent");
  });

  document
    .querySelector(`[data-tab="${tabName}"]`)
    .classList.add("active", "text-blue-600", "border-blue-500");
  document
    .querySelector(`[data-tab="${tabName}"]`)
    .classList.remove("text-gray-500", "border-transparent");

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.getElementById(tabName).classList.add("active");
}

async function fetchAllData() {
  if (dashboardData.loading) return;

  dashboardData.loading = true;
  updateLoadingState(true);

  try {
    const [domainsRes, typesRes, blockedRes, clientsRes] = await Promise.all([
      fetch(API_ENDPOINTS.topDomains),
      fetch(API_ENDPOINTS.queryTypes),
      fetch(API_ENDPOINTS.blockedDomains),
      fetch(API_ENDPOINTS.clients),
    ]);

    dashboardData.topDomains = await domainsRes.json();
    dashboardData.queryTypes = await typesRes.json();
    dashboardData.blockedDomains = await blockedRes.json();
    dashboardData.clients = await clientsRes.json();
    dashboardData.lastUpdated = new Date();

    updateAllViews();
  } catch (error) {
    console.error("Failed to fetch data:", error);
    // In a real app, you might want to show an error message
  } finally {
    dashboardData.loading = false;
    updateLoadingState(false);
  }
}

async function fetchClientQueries(client, page = 1) {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.clientQueries}?client=${client}&page=${page}&page_size=20`,
    );
    dashboardData.clientQueries = await response.json();
    dashboardData.selectedClient = client;
    dashboardData.currentPage = page;
    updateClientDetails();
  } catch (error) {
    console.error("Failed to fetch client queries:", error);
  }
}

function updateLoadingState(loading) {
  const refreshIcon = document.getElementById("refreshIcon");
  const refreshBtn = document.getElementById("refreshBtn");

  if (loading) {
    refreshIcon.classList.add("loading");
    refreshBtn.disabled = true;
  } else {
    refreshIcon.classList.remove("loading");
    refreshBtn.disabled = false;
  }
}

function updateAllViews() {
  updateStatsCards();
  updateQueryTypesChart();
  updateTopDomainsOverview();
  updateBlockedDomainsOverview();
  updateTopDomainsList();
  updateDomainVisualization();
  updateTopClientsList();
  updateBlockedDomainsList();
  updateLastUpdatedTime();
}

function updateStatsCards() {
  const totalQueries = dashboardData.queryTypes.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const blockedQueries =
    dashboardData.queryTypes.find((t) => t.type === "UNKNOWN")?.count || 0;
  const blockedPercentage =
    totalQueries > 0 ? ((blockedQueries / totalQueries) * 100).toFixed(1) : "0";

  document.getElementById("totalQueries").textContent =
    totalQueries.toLocaleString();
  document.getElementById("blockedPercentage").textContent =
    `${blockedPercentage}%`;
  document.getElementById("blockedCount").textContent =
    `${blockedQueries} blocked`;
  document.getElementById("activeClients").textContent =
    dashboardData.clients.length;
  document.getElementById("uniqueDomains").textContent =
    dashboardData.topDomains.length;
}

function updateQueryTypesChart() {
  const container = document.getElementById("queryTypesChart");
  const totalQueries = dashboardData.queryTypes.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  container.innerHTML = dashboardData.queryTypes
    .map((item, index) => {
      const percentage =
        totalQueries > 0 ? ((item.count / totalQueries) * 100).toFixed(1) : "0";
      const color = `hsl(${index * 45}, 70%, 50%)`;

      return `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <span class="font-medium">${item.type}</span>
                </div>
                <div class="text-right">
                    <div class="font-bold">${item.count.toLocaleString()}</div>
                    <div class="text-xs text-gray-500">${percentage}%</div>
                </div>
            </div>
        `;
    })
    .join("");
}

function updateTopDomainsOverview() {
  const container = document.getElementById("topDomainsOverview");

  container.innerHTML = dashboardData.topDomains
    .slice(0, 10)
    .map(
      (item, index) => `
        <div class="flex items-center justify-between p-2 rounded hover-card">
            <div class="flex items-center gap-3">
                <span class="text-sm font-mono text-gray-500">#${index + 1}</span>
                <span class="font-medium">${item.domain}</span>
            </div>
            <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">${item.count}</span>
        </div>
    `,
    )
    .join("");
}

function updateBlockedDomainsOverview() {
  const container = document.getElementById("blockedDomainsOverview");

  container.innerHTML = dashboardData.blockedDomains
    .slice(0, 12)
    .map(
      (item, index) => `
        <div class="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 blocked-domain cursor-pointer transition-colors"
             onclick="openUnblockModal('${item.domain}')"
             title="Click to unblock this domain">
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-mono text-red-500 flex-shrink-0">#${index + 1}</span>
                <span class="font-medium text-red-900 truncate" title="${item.domain}">${item.domain}</span>
            </div>
            <span class="px-2 py-1 bg-red-600 text-white text-xs rounded flex-shrink-0">${item.count}</span>
        </div>
    `,
    )
    .join("");
}

function updateTopDomainsList() {
  const container = document.getElementById("topDomainsList");

  container.innerHTML = dashboardData.topDomains
    .map(
      (item, index) => `
        <div class="flex items-center justify-between p-3 border rounded-lg">
            <div class="flex items-center gap-3">
                <span class="text-sm font-mono text-gray-500 w-8">#${index + 1}</span>
                <span class="font-medium">${item.domain}</span>
            </div>
            <span class="px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded">${item.count} queries</span>
        </div>
    `,
    )
    .join("");
}

function updateDomainVisualization() {
  const container = document.getElementById("domainVisualization");
  const maxCount = dashboardData.topDomains[0]?.count || 1;

  container.innerHTML = dashboardData.topDomains
    .slice(0, 10)
    .map((item) => {
      const percentage = (item.count / maxCount) * 100;

      return `
            <div class="space-y-1">
                <div class="flex justify-between text-sm">
                    <span class="truncate">${item.domain}</span>
                    <span class="font-mono">${item.count}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full progress-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    })
    .join("");
}

function updateTopClientsList() {
  const container = document.getElementById("topClientsList");

  container.innerHTML = dashboardData.clients
    .map(
      (item, index) => `
        <div class="flex items-center justify-between p-3 border rounded-lg cursor-pointer client-item transition-colors"
             onclick="selectClient('${item.client}')">
            <div class="flex items-center gap-3">
                <span class="text-sm font-mono text-gray-500 w-8">#${index + 1}</span>
                <span class="font-mono">${item.client}</span>
            </div>
            <span class="px-2 py-1 ${dashboardData.selectedClient === item.client ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700"} text-xs rounded">
                ${item.count} queries
            </span>
        </div>
    `,
    )
    .join("");
}

function updateBlockedDomainsList() {
  const container = document.getElementById("blockedDomainsList");

  container.innerHTML = dashboardData.blockedDomains
    .map(
      (item, index) => `
        <div class="p-4 border border-red-200 rounded-lg bg-red-50 cursor-pointer blocked-domain transition-colors"
             onclick="openUnblockModal('${item.domain}')"
             title="Click to unblock this domain">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    <span class="font-medium text-red-900">${item.domain}</span>
                </div>
                <span class="px-2 py-1 bg-red-600 text-white text-xs rounded">${item.count}</span>
            </div>
            <p class="text-xs text-red-600 mt-1">Blocked ${item.count} times</p>
        </div>
    `,
    )
    .join("");
}

function selectClient(client) {
  fetchClientQueries(client, 1);
}

function updateClientDetails() {
  const container = document.getElementById("clientDetails");
  const titleElement = document.getElementById("clientDetailsTitle");

  if (!dashboardData.selectedClient) {
    container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                Click on a client IP address to view their query history
            </div>
        `;
    titleElement.textContent = "Select a client to view details";
    return;
  }

  titleElement.textContent = `Queries from ${dashboardData.selectedClient}`;

  container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <input type="text" value="${dashboardData.selectedClient}"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                       onchange="selectClient(this.value)">
                <button onclick="selectClient(document.querySelector('#clientDetails input').value)"
                        class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-2 max-h-80 overflow-y-auto">
                ${dashboardData.clientQueries
                  .map(
                    (query, index) => `
                    <div class="flex items-center justify-between p-2 border rounded text-sm">
                        <div class="flex items-center gap-3">
                            <span class="font-mono text-gray-500">${formatTimestamp(query.timestamp)}</span>
                            <span class="font-medium">${query.domain}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded">${query.type}</span>
                            ${query.blocked === 1 ? '<span class="px-2 py-1 bg-red-600 text-white text-xs rounded">BLOCKED</span>' : ""}
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>

            <div class="flex justify-center gap-2">
                <button onclick="changePage(-1)"
                        ${dashboardData.currentPage === 1 ? "disabled" : ""}
                        class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50">
                    Previous
                </button>
                <span class="px-3 py-1 text-sm">Page ${dashboardData.currentPage}</span>
                <button onclick="changePage(1)"
                        class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    Next
                </button>
            </div>
        </div>
    `;
}

function changePage(direction) {
  const newPage = Math.max(1, dashboardData.currentPage + direction);
  fetchClientQueries(dashboardData.selectedClient, newPage);
}

function updateLastUpdatedTime() {
  const element = document.getElementById("lastUpdated");
  if (dashboardData.lastUpdated) {
    element.textContent = `Last updated: ${dashboardData.lastUpdated.toLocaleTimeString()}`;
  }
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (dashboardData.autoRefresh && dashboardData.refreshInterval > 0) {
    refreshTimer = setInterval(
      fetchAllData,
      dashboardData.refreshInterval * 1000,
    );
  }
}

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

function openUnblockModal(domain) {
  document.getElementById("selectedDomain").textContent = domain;
  document.getElementById("mikrotikCommand").textContent =
    generateMikroTikCommand(domain);
  document.getElementById("unblockModal").classList.add("active");
}

function closeModal() {
  document.getElementById("unblockModal").classList.remove("active");
}

function generateMikroTikCommand(domain) {
  return `/ip/dns/static add name="${domain}" type=FWD match-subdomain=yes`;
}

async function copyToClipboard() {
  const command = document.getElementById("mikrotikCommand").textContent;
  try {
    await navigator.clipboard.writeText(command);
    alert("Command copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy: ", err);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = command;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert("Command copied to clipboard!");
  }
}
