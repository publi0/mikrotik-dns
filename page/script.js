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
  isInitialLoad: true,
};
let refreshTimer = null;
const API_ENDPOINTS = {
  topDomains: "/api/top-domains",
  queryTypes: "/api/query-types",
  blockedDomains: "/api/blocked-domains",
  clients: "/api/clients",
  clientQueries: "/api/client-queries",
};

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("initial-load");
  initializeEventListeners();
  fetchAllData();
  setupAutoRefresh();
  lucide.createIcons();

  setTimeout(() => {
    document.body.classList.remove("initial-load");
    dashboardData.isInitialLoad = false;
  }, 2000);
});

function initializeEventListeners() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", function () {
      switchTab(this.dataset.tab);
    });
  });
  document.getElementById("refreshBtn").addEventListener("click", fetchAllData);
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
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeModal);
  document
    .getElementById("copyCommand")
    .addEventListener("click", copyToClipboard);
  document
    .getElementById("unblockModal")
    .addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
}

function switchTab(tabName) {
  const allTabs = document.querySelectorAll(".tab-content");
  const allButtons = document.querySelectorAll(".tab-button");

  // Remove active state de todos
  allTabs.forEach((tab) => {
    tab.classList.remove("active");
    tab.style.opacity = "0";
    tab.style.transform = "translateY(10px)";
  });
  allButtons.forEach((button) => {
    button.classList.remove("active", "bg-blue-600", "text-white", "shadow");
    button.classList.add("text-gray-400");
  });

  // Ativa o botão clicado
  const btn = document.querySelector(`[data-tab="${tabName}"]`);
  btn.classList.add("active", "bg-blue-600", "text-white", "shadow");
  btn.classList.remove("text-gray-400");

  // Aguarda um pequeno tempo para garantir display:block e animação
  setTimeout(() => {
    const newTab = document.getElementById(tabName);
    newTab.classList.add("active");
    newTab.style.opacity = "1";
    newTab.style.transform = "translateY(0)";

    // Só depois que ativou a aba, atualize o conteúdo da view
    setTimeout(() => {
      if (tabName === "overview") {
        updateTopDomainsOverview();
        updateBlockedDomainsOverview();
        updateQueryTypesChart();
      } else if (tabName === "domains") {
        updateTopDomainsList();
        updateDomainVisualization();
      } else if (tabName === "clients") {
        updateTopClientsList();
        updateClientDetails();
      } else if (tabName === "security") {
        updateBlockedDomainsList();
      }
    }, 350); // igual ou maior que o tempo de transição CSS (0.3s)
  }, 50); // delay pequeno para garantir que display:block já foi aplicado
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

  animateCounter("totalQueries", totalQueries);
  animateCounter("blockedPercentage", blockedPercentage, "%");
  animateCounter("activeClients", dashboardData.clients.length);
  animateCounter("uniqueDomains", dashboardData.topDomains.length);

  document.getElementById("blockedCount").textContent =
    `${blockedQueries} blocked`;
}

function animateCounter(elementId, targetValue, suffix = "") {
  const element = document.getElementById(elementId);
  const currentValue = parseInt(element.textContent.replace(/[^\d]/g, "")) || 0;
  const increment = Math.ceil((targetValue - currentValue) / 20);

  if (currentValue === targetValue) return;

  let current = currentValue;
  const timer = setInterval(() => {
    current += increment;
    if (
      (increment > 0 && current >= targetValue) ||
      (increment < 0 && current <= targetValue)
    ) {
      current = targetValue;
      clearInterval(timer);
    }
    element.textContent = current.toLocaleString() + suffix;
  }, 50);
}

function getDnsTypeClass(type) {
  const typeLower = type.toLowerCase();
  const classMap = {
    a: "dns-type-a",
    aaaa: "dns-type-aaaa",
    cname: "dns-type-cname",
    mx: "dns-type-mx",
    ns: "dns-type-ns",
    ptr: "dns-type-ptr",
    soa: "dns-type-soa",
    srv: "dns-type-srv",
    txt: "dns-type-txt",
    unknown: "dns-type-unknown",
    caa: "dns-type-caa",
    ds: "dns-type-ds",
    dnskey: "dns-type-dnskey",
    rrsig: "dns-type-rrsig",
    nsec: "dns-type-nsec",
    tlsa: "dns-type-tlsa",
    sshfp: "dns-type-sshfp",
    naptr: "dns-type-naptr",
    svcb: "dns-type-svcb",
    https: "dns-type-https",
  };
  return classMap[typeLower] || "dns-type-other";
}

function updateQueryTypesChart() {
  const container = document.getElementById("queryTypesChart");
  const totalQueries = dashboardData.queryTypes.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  container.innerHTML = dashboardData.queryTypes
    .map((item) => {
      const percentage =
        totalQueries > 0 ? ((item.count / totalQueries) * 100).toFixed(1) : "0";
      const typeClass = getDnsTypeClass(item.type);

      return `<div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-4 h-4 rounded ${typeClass}"></div>
          <span class="font-medium text-white">${item.type}</span>
        </div>
        <div class="text-right">
          <div class="font-bold text-white">${item.count.toLocaleString()}</div>
          <div class="text-xs text-gray-400">${percentage}%</div>
        </div>
      </div>`;
    })
    .join("");
}

function updateTopDomainsOverview() {
  const container = document.getElementById("topDomainsOverview");
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.topDomains
    .slice(0, 10)
    .map(
      (item, index) =>
        `<div class="flex items-center justify-between p-2 rounded hover-card ${useStagger ? "stagger-item" : ""}" ${useStagger ? `style="animation-delay: ${index * 0.1}s"` : ""}><div class="flex items-center gap-3 min-w-0"><span class="text-sm font-mono text-gray-400">#${index + 1}</span><span class="font-medium text-white truncate" title="${item.domain}">${item.domain}</span></div><span class="px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded flex-shrink-0">${item.count}</span></div>`,
    )
    .join("");

  container.innerHTML = content;
}

function updateBlockedDomainsOverview() {
  const container = document.getElementById("blockedDomainsOverview");
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.blockedDomains
    .slice(0, 12)
    .map(
      (item, index) =>
        `<div class="flex items-center justify-between p-3 border border-red-800 rounded-lg bg-red-900/20 blocked-domain cursor-pointer transition-colors ${useStagger ? "stagger-item" : ""}" onclick="openUnblockModal('${item.domain}')" title="Click to unblock this domain" ${useStagger ? `style="animation-delay: ${index * 0.05}s"` : ""}><div class="flex items-center gap-2 min-w-0"><span class="text-xs font-mono text-red-400 flex-shrink-0">#${index + 1}</span><span class="font-medium text-red-100 truncate" title="${item.domain}">${item.domain}</span></div><span class="px-2 py-1 bg-red-500 text-white text-xs rounded flex-shrink-0">${item.count}</span></div>`,
    )
    .join("");

  container.innerHTML = content;
}

function updateTopDomainsList() {
  const container = document.getElementById("topDomainsList");
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.topDomains
    .map(
      (item, index) =>
        `<div class="flex items-center justify-between p-3 border border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 ${useStagger ? "stagger-item" : ""}" ${useStagger ? `style="animation-delay: ${index * 0.02}s"` : ""}><div class="flex items-center gap-3"><span class="text-sm font-mono text-gray-400 w-8">#${index + 1}</span><span class="font-medium text-white">${item.domain}</span></div><span class="px-2 py-1 border border-gray-600 text-gray-300 text-xs rounded">${item.count} queries</span></div>`,
    )
    .join("");

  container.innerHTML = content;
}

function updateDomainVisualization() {
  const container = document.getElementById("domainVisualization");
  const maxCount = dashboardData.topDomains[0]?.count || 1;
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.topDomains
    .slice(0, 10)
    .map((item, index) => {
      const percentage = (item.count / maxCount) * 100;
      return `<div class="space-y-1 ${useStagger ? "stagger-item" : ""}" ${useStagger ? `style="animation-delay: ${index * 0.1}s"` : ""}><div class="flex justify-between text-sm"><span class="truncate text-white">${item.domain}</span><span class="font-mono text-gray-400">${item.count}</span></div><div class="w-full bg-gray-700 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full progress-bar" style="width: ${percentage}%; ${useStagger ? `animation-delay: ${index * 0.1 + 0.5}s` : ""}"></div></div></div>`;
    })
    .join("");

  container.innerHTML = content;
}

function updateTopClientsList() {
  const container = document.getElementById("topClientsList");
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.clients
    .map(
      (item, index) =>
        `<div class="flex items-center justify-between p-3 border border-gray-700 rounded-lg cursor-pointer client-item transition-colors ${useStagger ? "stagger-item" : ""}" onclick="selectClient('${item.client}')" ${useStagger ? `style="animation-delay: ${index * 0.05}s"` : ""}><div class="flex items-center gap-3"><span class="text-sm font-mono text-gray-400 w-8">#${index + 1}</span><span class="font-mono text-white">${item.client}</span></div><span class="px-2 py-1 ${dashboardData.selectedClient === item.client ? "bg-blue-600 text-white" : "border border-gray-600 text-gray-300"} text-xs rounded">${item.count} queries</span></div>`,
    )
    .join("");

  container.innerHTML = content;
}

function updateBlockedDomainsList() {
  const container = document.getElementById("blockedDomainsList");
  const useStagger = dashboardData.isInitialLoad;
  const content = dashboardData.blockedDomains
    .map(
      (item, index) =>
        `<div class="p-4 border border-red-800 rounded-lg bg-red-900/20 cursor-pointer blocked-domain transition-colors ${useStagger ? "stagger-item" : ""}" onclick="openUnblockModal('${item.domain}')" title="Click to unblock this domain" ${useStagger ? `style="animation-delay: ${index * 0.05}s"` : ""}><div class="flex items-center justify-between"><div class="flex items-center gap-2"><i data-lucide="shield-off" class="h-4 w-4 text-red-400"></i><span class="font-medium text-red-100">${item.domain}</span></div><span class="px-2 py-1 bg-red-500 text-white text-xs rounded">${item.count}</span></div><p class="text-xs text-red-400 mt-1">Blocked ${item.count} times</p></div>`,
    )
    .join("");

  container.innerHTML = content;
  lucide.createIcons();
}

function selectClient(client) {
  fetchClientQueries(client, 1);
}

function updateClientDetails() {
  const container = document.getElementById("clientDetails");
  const titleElement = document.getElementById("clientDetailsTitle");
  if (!dashboardData.selectedClient) {
    container.innerHTML = `<div class="text-center text-gray-400 py-8">Click on a client IP address to view their query history</div>`;
    titleElement.textContent = "Select a client to view details";
    return;
  }
  titleElement.textContent = `Queries from ${dashboardData.selectedClient}`;
  const useStagger = dashboardData.isInitialLoad;
  container.innerHTML = `<div class="space-y-4"><div class="flex items-center gap-2"><input type="text" value="${dashboardData.selectedClient}" class="flex-1 px-3 py-2 border border-gray-600 rounded font-mono text-sm bg-gray-700 text-white" onchange="selectClient(this.value)"><button onclick="selectClient(document.querySelector('#clientDetails input').value)" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"><i data-lucide="search" class="h-4 w-4"></i></button></div><div class="space-y-2">${dashboardData.clientQueries
    .map(
      (
        query,
        index,
      ) => `<div class="flex items-center justify-between p-2 border border-gray-700 rounded text-sm hover:shadow-sm transition-all duration-200 ${useStagger ? "stagger-item" : ""}" ${useStagger ? `style="animation-delay: ${index * 0.02}s"` : ""}><div class="flex items-center gap-3"><span class="font-mono text-gray-400">${formatTimestamp(query.timestamp)}</span><span class="font-medium text-white">${query.domain}</span></div><div class="flex items-center gap-2"><span class="px-2 py-1 text-xs rounded font-mono ${getDnsTypeClass(query.type)}">
    ${query.type}
  </span>
${query.blocked === 1 ? '<span class="px-2 py-1 bg-red-500 text-white text-xs rounded">BLOCKED</span>' : ""}</div></div>`,
    )
    .join(
      "",
    )}</div><div class="flex justify-center gap-2"><button onclick="changePage(-1)" ${dashboardData.currentPage === 1 ? "disabled" : ""} class="px-3 py-1 border border-gray-600 rounded text-sm hover:bg-gray-700 disabled:opacity-50 text-gray-300 transition-all duration-200">Previous</button><span class="px-3 py-1 text-sm text-gray-300">Page ${dashboardData.currentPage}</span><button onclick="changePage(1)" class="px-3 py-1 border border-gray-600 rounded text-sm hover:bg-gray-700 text-gray-300 transition-all duration-200">Next</button></div></div>`;

  lucide.createIcons();
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
  lucide.createIcons();
}

function closeModal() {
  document.getElementById("unblockModal").classList.remove("active");
}

function generateMikroTikCommand(domain) {
  return `/ip/dns/static add name="${domain}" type=FWD match-subdomain=yes`;
}

async function copyToClipboard() {
  const command = document.getElementById("mikrotikCommand").textContent;
  const button = document.getElementById("copyCommand");
  const originalText = button.textContent;

  try {
    await navigator.clipboard.writeText(command);
    button.textContent = "Copied!";
    button.classList.add("bg-green-600", "hover:bg-green-700");
    button.classList.remove("bg-blue-600", "hover:bg-blue-700");

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("bg-green-600", "hover:bg-green-700");
      button.classList.add("bg-blue-600", "hover:bg-blue-700");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
    const textArea = document.createElement("textarea");
    textArea.value = command;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);

    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }
}
