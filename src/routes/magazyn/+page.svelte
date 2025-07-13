<script>
	import { getAllEquipment, equipmentTypes, deleteEquipment, clearEquipmentCache, formatCount, pluralizePattern } from '$lib/data.js';
	import EquipmentHistoryModal from '$lib/EquipmentHistoryModal.svelte';
	import EquipmentEditModal from '$lib/EquipmentEditModal.svelte';
	import ExcelJS from 'exceljs';
	
	// Centralna konfiguracja aplikacji
	const APP_CONFIG = {
		equipmentTypes: [
			{ type: '', label: 'Wszystkie', icon: '📦' },
			{ type: 'Komputer', label: 'Komputer', icon: '💻' },
			{ type: 'Monitor', label: 'Monitor', icon: '🖥️' },
			{ type: 'Drukarka', label: 'Drukarka', icon: '🖨️' },
			{ type: 'Myszka', label: 'Myszka', icon: '🖱️' },
			{ type: 'Klawiatura', label: 'Klawiatura', icon: '⌨️' },
			{ type: 'Zasilacz', label: 'Zasilacz', icon: '🔌' },
			{ type: 'Stacja dokująca', label: 'Stacja dokująca', icon: '🔗' },
			{ type: 'YubiKey', label: 'YubiKey', icon: '🔐' }
		],
		statusFilters: [
			{ value: '', label: 'Wszystkie' },
			{ value: 'assigned', label: 'Przypisane' },
			{ value: 'unassigned', label: 'Nieprzypisane' },
			{ value: 'damaged', label: 'Uszkodzone' }
		],
		exportColumns: [
			{ header: 'Nazwa', key: 'name', width: 25 },
			{ header: 'Typ', key: 'type', width: 15 },
			{ header: 'Numer seryjny', key: 'serialNumber', width: 20 },
			{ header: 'Numer CLN', key: 'clnNumber', width: 15 },
			{ header: 'Numer inwentarzowy', key: 'inventoryNumber', width: 20 },
			{ header: 'Status', key: 'status', width: 15 },
			{ header: 'Uszkodzone', key: 'damaged', width: 10 },
			{ header: 'Przypisane do', key: 'assignedTo', width: 30 },
			{ header: 'Email użytkownika', key: 'userEmail', width: 30 },
			{ header: 'Data ostatniej zmiany', key: 'lastModified', width: 15 }
		],
		summaryColumns: [
			{ header: 'Typ sprzętu', key: 'type', width: 20 },
			{ header: 'Liczba pozycji', key: 'total', width: 15 },
			{ header: 'Przypisane', key: 'assigned', width: 15 },
			{ header: 'W magazynie', key: 'available', width: 15 },
			{ header: 'Uszkodzone', key: 'damaged', width: 15 }
		],
		ui: {
			updateIndicatorDelay: 3000,
			updatingIndicatorDelay: 500,
			transitions: {
				buttonHover: 'transition-all duration-200 hover:shadow-md hover:scale-105',
				colorTransition: 'transition-colors duration-150',
				loadingTransition: 'transition-all duration-300'
			}
		},
		styles: {
			selectedButton: 'border-green-500 bg-green-50 text-green-700',
			unselectedButton: 'border-gray-200 bg-white text-gray-600 hover:border-green-300',
			baseButton: 'flex-1 min-w-[140px] flex flex-col items-center p-4 rounded-lg border-2'
		}
	};
	
	// Types
	/** @typedef {{id: number, name: string, type: string, serialNumber: string, clnNumber?: string, inventoryNumber?: string, roomLocation?: string, assignedUser?: {name: string, email: string}, lastModified?: string, damaged?: boolean}} Equipment */
	
	// State management with Svelte 5 runes
	let equipment = $state(/** @type {Equipment[]} */ ([]));
	let selectedType = $state('');
	let selectedStatus = $state('');
	let searchTerm = $state('');
	let isLoading = $state(true);
	let isUpdating = $state(false);
	let recentlyUpdatedId = $state(/** @type {number | null} */ (null));
	
	// Modal state
	let isModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let selectedEquipment = $state(/** @type {Equipment | null} */ (null));
	let selectedEquipmentForEdit = $state(/** @type {Equipment | null} */ (null));
	
	// Utility functions - DRY helpers
	/**
	 * Get equipment type icon
	 * @param {string} type
	 * @returns {string}
	 */
	const getEquipmentIcon = (type) => {
		const config = APP_CONFIG.equipmentTypes.find(config => config.type === type);
		return config ? config.icon : '📦';
	};
	
	/**
	 * Check if equipment is assigned
	 * @param {Equipment} item
	 * @returns {boolean}
	 */
	const isEquipmentAssigned = (item) => {
		return Boolean(item.assignedUser || ((item.type === 'Monitor' || item.type === 'Drukarka') && item.roomLocation));
	};
	
	/**
	 * Get equipment count for specific type with pluralization
	 * @param {string} type
	 * @returns {string}
	 */
	const getEquipmentCountByType = (type) => {
		const count = !type ? equipment.length : equipment.filter(item => item.type === type).length;
		return formatCount(count, 'equipment');
	};
	
	/**
	 * Get category button classes with DRY styling
	 * @param {string} type
	 * @returns {string}
	 */
	const getCategoryButtonClasses = (type) => {
		const baseClasses = `${APP_CONFIG.styles.baseButton} ${APP_CONFIG.ui.transitions.buttonHover}`;
		const isSelected = selectedType === type;
		
		if (isSelected) {
			return `${baseClasses} ${APP_CONFIG.styles.selectedButton}`;
		} else {
			return `${baseClasses} ${APP_CONFIG.styles.unselectedButton}`;
		}
	};
	
	/**
	 * Format equipment data for export with DRY logic
	 * @param {Equipment[]} items
	 * @returns {Array<Record<string, string>>}
	 */
	const formatEquipmentData = (items) => {
		return items.map(item => ({
			name: item.name,
			type: item.type,
			serialNumber: item.serialNumber,
			clnNumber: item.clnNumber || '-',
			inventoryNumber: item.inventoryNumber || '-',
			status: isEquipmentAssigned(item) ? 'Przypisane' : 'Magazyn IT',
			damaged: item.damaged ? 'Tak' : 'Nie',
			assignedTo: item.assignedUser ? 
				item.assignedUser.name : 
				((item.type === 'Monitor' || item.type === 'Drukarka') && item.roomLocation) ? 
					item.roomLocation : '-',
			userEmail: item.assignedUser ? item.assignedUser.email : '-',
			lastModified: item.lastModified ? new Date(item.lastModified).toLocaleDateString('pl-PL') : 'Brak danych'
		}));
	};
	
	/**
	 * Generate filename with current date
	 * @param {string} prefix
	 * @returns {string}
	 */
	const generateFilename = (prefix = 'Magazyn_Sprzetu') => {
		const today = new Date();
		const dateString = today.toLocaleDateString('pl-PL').replace(/\./g, '-');
		return `${prefix}_${dateString}.xlsx`;
	};
	
	// Derived states using Svelte 5 $derived with DRY filtering logic
	let filteredEquipment = $derived.by(() => {
		const filtered = equipment.filter(item => {
			const matchesType = !selectedType || item.type === selectedType;
			const assigned = isEquipmentAssigned(item);
			const matchesStatus = !selectedStatus || 
				(selectedStatus === 'assigned' && assigned) ||
				(selectedStatus === 'unassigned' && !assigned) ||
				(selectedStatus === 'damaged' && item.damaged);
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch = !searchTerm || 
				item.name.toLowerCase().includes(searchLower) ||
				item.serialNumber.toLowerCase().includes(searchLower) ||
				(item.clnNumber && item.clnNumber.toLowerCase().includes(searchLower)) ||
				(item.inventoryNumber && item.inventoryNumber.toLowerCase().includes(searchLower)) ||
				(item.roomLocation && item.roomLocation.toLowerCase().includes(searchLower)) ||
				(item.assignedUser && item.assignedUser.email.toLowerCase().includes(searchLower));
			
			return matchesType && matchesStatus && matchesSearch;
		});

		// Sort equipment: computers by CLN number (ascending), others by name
		return filtered.sort((a, b) => {
			// For computers, sort by CLN number first
			if (a.type === 'Komputer' && b.type === 'Komputer') {
				const aClnNum = a.clnNumber ? parseInt(a.clnNumber.replace(/\D/g, '')) : 0;
				const bClnNum = b.clnNumber ? parseInt(b.clnNumber.replace(/\D/g, '')) : 0;
				
				// If both have CLN numbers, sort by number
				if (a.clnNumber && b.clnNumber) {
					return aClnNum - bClnNum;
				}
				// Items with CLN come before items without CLN
				if (a.clnNumber && !b.clnNumber) return -1;
				if (!a.clnNumber && b.clnNumber) return 1;
				// If neither has CLN, sort by name
				return a.name.localeCompare(b.name, 'pl');
			}
			
			// Computers come first, then sort by type and name
			if (a.type === 'Komputer' && b.type !== 'Komputer') return -1;
			if (a.type !== 'Komputer' && b.type === 'Komputer') return 1;
			
			// For non-computers, sort by type first, then by name
			if (a.type !== b.type) {
				return a.type.localeCompare(b.type, 'pl');
			}
			
			// Same type, sort by name
			return a.name.localeCompare(b.name, 'pl');
		});
	});
	
	let assignedCount = $derived.by(() => 
		equipment.filter(item => isEquipmentAssigned(item)).length
	);
	
	let availableCount = $derived.by(() => 
		equipment.filter(item => !isEquipmentAssigned(item)).length
	);
	
	let damagedCount = $derived.by(() => 
		equipment.filter(item => item.damaged).length
	);
	
	// Load equipment on mount
	$effect(() => {
		loadEquipment();
	});
	
	// Action handlers - DRY approach
	/**
	 * Clear all filters
	 */
	function clearAllFilters() {
		selectedType = '';
		selectedStatus = '';
		searchTerm = '';
	}

	/**
	 * Select equipment type
	 * @param {string} type
	 */
	function selectEquipmentType(type) {
		selectedType = type;
	}

	// Data loading and management functions - DRY approach
	async function loadEquipment() {
		try {
			isLoading = true;
			clearEquipmentCache();
			equipment = await getAllEquipment();
		} catch (error) {
			console.error('Error loading equipment:', error);
		} finally {
			isLoading = false;
		}
	}
	
	/**
	 * Update equipment locally for immediate UI feedback
	 * @param {Equipment} updatedEquipmentData
	 */
	function updateEquipmentLocally(updatedEquipmentData) {
		const index = equipment.findIndex(item => item.id === updatedEquipmentData.id);
		if (index !== -1) {
			equipment[index] = { ...equipment[index], ...updatedEquipmentData };
			equipment = [...equipment]; // Force reactivity
		}
	}
	
	/**
	 * Handle equipment update with optimistic UI updates
	 * @param {Equipment | null} updatedData
	 */
	async function handleEquipmentUpdate(updatedData = null) {
		if (updatedData) {
			updateEquipmentLocally(updatedData);
			recentlyUpdatedId = updatedData.id;
			setTimeout(() => {
				recentlyUpdatedId = null;
			}, APP_CONFIG.ui.updateIndicatorDelay);
		}
		
		isUpdating = true;
		try {
			await loadEquipment();
		} finally {
			setTimeout(() => {
				isUpdating = false;
			}, APP_CONFIG.ui.updatingIndicatorDelay);
		}
	}
	
	// Modal handlers - DRY approach
	/**
	 * @param {Equipment} item
	 */
	function showHistory(item) {
		selectedEquipment = item;
		isModalOpen = true;
	}

	/**
	 * @param {Event} event
	 * @param {Equipment} item
	 */
	function handleEditEquipment(event, item) {
		event.stopPropagation();
		selectedEquipmentForEdit = item;
		isEditModalOpen = true;
	}

	// Excel export function - refactored with DRY helpers
	async function exportToExcel() {
		try {
			const workbook = new ExcelJS.Workbook();
			
			// Equipment grouped by type with DRY logic
			/** @type {Record<string, Equipment[]>} */
			const equipmentByType = {};
			
			// Initialize all equipment types from config
			Object.values(equipmentTypes).forEach(type => {
				equipmentByType[type] = [];
			});
			
			// Group equipment by types
			equipment.forEach(item => {
				if (equipmentByType[item.type]) {
					equipmentByType[item.type].push(item);
				}
			});
			
			// Add summary sheet as first sheet using config
			const summaryWorksheet = workbook.addWorksheet('Podsumowanie');
			summaryWorksheet.columns = APP_CONFIG.summaryColumns;
			
			const summaryData = Object.keys(equipmentByType).map(type => ({
				type: type,
				total: equipmentByType[type].length,
				assigned: equipmentByType[type].filter(item => isEquipmentAssigned(item)).length,
				available: equipmentByType[type].filter(item => !isEquipmentAssigned(item)).length,
				damaged: equipmentByType[type].filter(item => item.damaged).length
			}));
			
			summaryWorksheet.addRows(summaryData);
			
			// Create a sheet for each equipment type
			Object.keys(equipmentByType).forEach(type => {
				if (equipmentByType[type].length > 0) {
					const worksheet = workbook.addWorksheet(type);
					worksheet.columns = APP_CONFIG.exportColumns;
					const data = formatEquipmentData(equipmentByType[type]);
					worksheet.addRows(data);
				}
			});
			
			// Add "All Equipment" sheet
			const allEquipmentWorksheet = workbook.addWorksheet('Wszystko');
			allEquipmentWorksheet.columns = APP_CONFIG.exportColumns;
			const allEquipmentData = formatEquipmentData(equipment);
			allEquipmentWorksheet.addRows(allEquipmentData);
			
			// Save file with generated filename
			const fileName = generateFilename();
			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error exporting to Excel:', error);
		}
	}
</script>

<div class="px-2 py-6 sm:px-4 lg:px-6 xl:px-8 2xl:px-12">
	<div class="border-4 border-dashed border-green-200 rounded-lg p-4 sm:p-6 lg:p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
			<h2 class="text-2xl lg:text-3xl font-bold text-green-800 mb-4 lg:mb-0 whitespace-nowrap">📦 Magazyn Sprzętu</h2>
			<button
				onclick={exportToExcel}
				class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 {APP_CONFIG.ui.transitions.colorTransition} cursor-pointer whitespace-nowrap"
				title="Eksportuj do Excel"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
				</svg>
				📊 Eksportuj do Excel
			</button>
		</div>
		
		<!-- Filtry -->
		<div class="bg-white p-4 lg:p-6 rounded-lg shadow-sm mb-6">
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div>
					<label for="search" class="block text-sm font-medium text-green-700 mb-1">
						Wyszukaj:
					</label>
					<input
						id="search"
						type="text"
						bind:value={searchTerm}
						placeholder="Nazwa, S/N, CLN, INV, lokalizacja..."
						class="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
					/>
				</div>
				
				<div>
					<label for="status-filter" class="block text-sm font-medium text-green-700 mb-1">
						Status:
					</label>
					<select
						id="status-filter"
						bind:value={selectedStatus}
						class="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
					>
						{#each APP_CONFIG.statusFilters as filter}
							<option value={filter.value}>{filter.label}</option>
						{/each}
					</select>
				</div>
				
				<div class="flex items-end">
					<button
						onclick={clearAllFilters}
						class="w-full px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 {APP_CONFIG.ui.transitions.colorTransition}"
						title="Wyczyść wszystkie filtry"
					>
						Wyczyść filtry
					</button>
				</div>
			</div>
		</div>

		<!-- Statystyki -->
		{#if isLoading}
			<div class="flex justify-center items-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
				<span class="ml-3 text-green-600">Ładowanie sprzętu...</span>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div class="bg-green-100 p-4 rounded-lg">
					<div class="flex items-center">
						<div class="text-2xl">📦</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-green-600">Łącznie sprzętu</p>
							<p class="text-2xl font-bold text-green-900">{formatCount(equipment.length, 'equipment')}</p>
						</div>
					</div>
				</div>
				
				<div class="bg-blue-100 p-4 rounded-lg">
					<div class="flex items-center">
						<div class="text-2xl">✅</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-blue-600">Przypisane</p>
							<p class="text-2xl font-bold text-blue-900">{formatCount(assignedCount, 'equipment')}</p>
						</div>
					</div>
				</div>
				
				<div class="bg-orange-100 p-4 rounded-lg">
					<div class="flex items-center">
						<div class="text-2xl">⏳</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-orange-600">Magazyn IT</p>
							<p class="text-2xl font-bold text-orange-900">{formatCount(availableCount, 'equipment')}</p>
						</div>
					</div>
				</div>
				
				<div class="bg-red-100 p-4 rounded-lg">
					<div class="flex items-center">
						<div class="text-2xl">⚠️</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-red-600">Uszkodzone</p>
							<p class="text-2xl font-bold text-red-900">{formatCount(damagedCount, 'equipment')}</p>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Menu kategorii -->
			<div class="bg-white shadow-sm rounded-lg p-4 lg:p-6 mb-6">
				<h3 class="text-lg font-semibold text-green-800 mb-4">🗂️ {formatCount(APP_CONFIG.equipmentTypes.length - 1, 'category')} sprzętu</h3>
				<div class="flex flex-wrap gap-3">
					{#each APP_CONFIG.equipmentTypes as config}
						<button
							onclick={() => selectEquipmentType(config.type)}
							class={getCategoryButtonClasses(config.type)}
							title={`Pokaż ${config.type ? config.label.toLowerCase() + 'y' : 'wszystkie kategorie'}`}
						>
							<div class="text-3xl mb-2">{config.icon}</div>
							<span class="text-sm font-medium text-center">{config.label}</span>
							<span class="text-xs text-gray-500 mt-1">({getEquipmentCountByType(config.type)})</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Lista sprzętu -->
		{#if !isLoading}
			<div class="bg-white shadow-sm rounded-lg overflow-hidden">
				<div class="px-2 py-5 sm:px-4 lg:px-6">
					<h3 class="text-lg leading-6 font-medium text-green-900 mb-4">
						Lista sprzętu ({formatCount(filteredEquipment.length, 'item')})
						{#if isUpdating}
							<span class="inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								<svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Aktualizowanie...
							</span>
						{/if}
						<span class="text-sm font-normal text-green-600 block mt-1">
							💡 Kliknij na wiersz, aby zobaczyć historię przypisania
						</span>
					</h3>
				
				{#if filteredEquipment.length > 0}
					<div class="w-full overflow-x-auto">
						<table class="min-w-full divide-y divide-green-200">
							<thead class="bg-green-50">
								<tr>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-20">
										Typ
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-48">
										Nazwa
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-40">
										Numer seryjny
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-36">
										Numer inwentarzowy
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-32">
										Status
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-56">
										Przypisany do
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider min-w-0 w-24">
										Akcje
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-green-200">
								{#each filteredEquipment as item}
									<tr 
										class="hover:bg-green-50 cursor-pointer {APP_CONFIG.ui.transitions.loadingTransition}"
										class:bg-green-100={recentlyUpdatedId === item.id}
										class:bg-red-50={item.damaged}
										class:border-red-200={item.damaged}
										class:shadow-lg={recentlyUpdatedId === item.id}
										onclick={() => showHistory(item)}
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && showHistory(item)}
									>
										<td class="px-3 py-4 w-20">
											<div class="flex items-center">
												<span class="text-lg mr-1">{getEquipmentIcon(item.type)}</span>
												<div class="text-xs text-green-900">
													<div class="truncate">{item.type}</div>
													{#if item.type === 'Komputer' && item.clnNumber}
														<div class="text-xs text-green-600 truncate">({item.clnNumber})</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-3 py-4 w-48">
											<div class="text-sm font-medium text-green-900 truncate" title={item.name}>{item.name}</div>
										</td>
										<td class="px-3 py-4 w-40">
											<div class="text-sm text-green-500 font-mono truncate" title={item.serialNumber}>{item.serialNumber}</div>
										</td>
										<td class="px-3 py-4 w-36">
											{#if item.inventoryNumber}
												<div class="text-sm text-blue-600 font-mono truncate" title={item.inventoryNumber}>{item.inventoryNumber}</div>
											{:else}
												<span class="text-gray-400 text-sm">-</span>
											{/if}
										</td>
										<td class="px-3 py-4 w-32">
											<div class="flex flex-col space-y-1">
												{#if isEquipmentAssigned(item)}
													<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
														✅ Przypisane
													</span>
												{:else}
													<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
														📦 Magazyn IT
													</span>
												{/if}
												{#if item.damaged}
													<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
														⚠️ Uszkodzone
													</span>
												{/if}
											</div>
										</td>
										<td class="px-3 py-4 text-sm text-green-900 w-56">
											{#if item.assignedUser}
												<div>
													<div class="font-medium truncate" title={item.assignedUser.name}>👤 {item.assignedUser.name}</div>
													<div class="text-green-500 truncate" title={item.assignedUser.email}>({item.assignedUser.email})</div>
												</div>
											{:else if (item.type === 'Monitor' || item.type === 'Drukarka') && item.roomLocation}
												<div class="font-medium text-purple-600 truncate" title={item.roomLocation}>📍 {item.roomLocation}</div>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
										<td class="px-3 py-4 text-sm text-green-900 w-24">
											<button
												onclick={(event) => handleEditEquipment(event, item)}
												class="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 {APP_CONFIG.ui.transitions.colorTransition}"
												title="Edytuj sprzęt"
											>
												✏️ Edytuj
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-center py-12">
						<div class="text-green-400 text-6xl mb-4">🔍</div>
						<h3 class="text-lg font-medium text-green-900 mb-2">Brak wyników</h3>
						<p class="text-green-600">Nie znaleziono sprzętu spełniającego kryteria wyszukiwania.</p>
					</div>
				{/if}
			</div>
		</div>
		{/if}
	</div>
</div>

<!-- Equipment History Modal -->
<EquipmentHistoryModal bind:isOpen={isModalOpen} equipment={selectedEquipment} />

<!-- Equipment Edit Modal -->
<EquipmentEditModal bind:isOpen={isEditModalOpen} equipment={selectedEquipmentForEdit} onUpdate={handleEquipmentUpdate} />
