let map;
let markers = [];
let markerCluster;
let companies = [];
let headers = [];
let popupColumns = [];

function initMap() {
  map = L.map('map').setView([45.464, 9.19], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

function buildTable(data) {
  const tbody = document.querySelector("#companyTable tbody");
  const thead = document.querySelector("#companyTable thead");

  if (data.length > 0) {
    headers = Object.keys(data[0]);
    thead.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
  }

  tbody.innerHTML = "";
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = headers.map(h => `<td>${row[h] || ""}</td>`).join("");
    tbody.appendChild(tr);
  });
}

function plotCompanies(data) {
  if (!map) return;
  if (markerCluster) markerCluster.clearLayers();
  else markerCluster = L.markerClusterGroup();

  markers = [];

  data.forEach(c => {
    const lat = parseFloat(c.lat || c.Latitudine || c.latitude);
    const lng = parseFloat(c.lng || c.Longitudine || c.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const marker = L.marker([lat, lng]);
    let popupContent = "";
    popupColumns.forEach(h => {
      if (c[h]) popupContent += `<strong>${h}:</strong> ${c[h]}<br>`;
    });
    marker.bindPopup(popupContent);
    markers.push(marker);
  });

  markerCluster.addLayers(markers);
  map.addLayer(markerCluster);
}

function buildPopupColumnsMenu(headers) {
  const menu = document.getElementById("popupColumnsMenu");
  menu.innerHTML = "";
  headers.forEach(h => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${h}" checked> ${h}`;
    menu.appendChild(label);
    menu.appendChild(document.createElement("br"));
  });

  menu.querySelectorAll("input").forEach(cb => {
    cb.addEventListener("change", () => {
      popupColumns = Array.from(menu.querySelectorAll("input:checked")).map(i => i.value);
      applyMultiFilters();
    });
  });

  popupColumns = [...headers];
}

// --- Filtri multipli a tendina ---
const multiFiltersContainer = document.getElementById("multiFilters");

function addFilter() {
  if(headers.length===0) return;
  const div = document.createElement("div");
  div.classList.add("filterRow");

  const colSelect = document.createElement("select");
  headers.forEach(h => {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h;
    colSelect.appendChild(option);
  });

  const valueSelect = document.createElement("select");
  valueSelect.innerHTML = '<option value="">Tutti</option>'; // inizialmente vuoto

  colSelect.addEventListener("change", () => {
    const col = colSelect.value;
    const values = [...new Set(companies.map(c => c[col]).filter(v => v))];
    valueSelect.innerHTML = '<option value="">Tutti</option>';
    values.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      valueSelect.appendChild(opt);
    });
  });

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "X";
  removeBtn.addEventListener("click", () => div.remove());

  div.appendChild(colSelect);
  div.appendChild(valueSelect);
  div.appendChild(removeBtn);
  multiFiltersContainer.appendChild(div);

  // trigger per popolare la select dei valori inizialmente
  colSelect.dispatchEvent(new Event("change"));
}

function applyMultiFilters() {
  let filtered = companies.slice();
  document.querySelectorAll(".filterRow").forEach(row => {
    const col = row.querySelector("select").value;
    const value = row.querySelectorAll("select")[1].value;
    if (value) {
      filtered = filtered.filter(c => c[col] && c[col] === value);
    }
  });
  buildTable(filtered);
  plotCompanies(filtered);
}

// Event listener
document.getElementById("addFilterBtn").addEventListener("click", addFilter);
document.getElementById("applyFiltersBtn").addEventListener("click", applyMultiFilters);
document.getElementById("clearFiltersBtn").addEventListener("click", () => {
  document.querySelectorAll(".filterRow").forEach(row => row.remove());
  buildTable(companies);
  plotCompanies(companies);
});

document.getElementById("popupColumnsBtn").addEventListener("click", () => {
  document.getElementById("popupColumnsMenu").classList.toggle("hidden");
});

// --- Caricamento file ---
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    let data;
    if (file.name.endsWith(".csv")) {
      const rows = event.target.result.trim().split("\n").map(r => r.split(","));
      const csvHeaders = rows[0];
      data = rows.slice(1).map(r => {
        let obj = {};
        csvHeaders.forEach((h,i)=>obj[h]=r[i]);
        return obj;
      });
    } else {
      const workbook = XLSX.read(event.target.result,{type:"array"});
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet,{header:1});
      const excelHeaders = sheetData[0];
      data = sheetData.slice(1).map(r=>{
        let obj = {};
        excelHeaders.forEach((h,i)=>obj[h]=r[i]);
        return obj;
      });
    }

    companies = data;

    if(data.length>0){
      const firstRow = data[0];
      const headersArray = Object.keys(firstRow);
      headers = headersArray;

      buildPopupColumnsMenu(headers);
      buildTable(companies);
      plotCompanies(companies);
    }
  };

  if(file.name.endsWith(".csv")) reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
});

document.addEventListener("DOMContentLoaded", initMap);
