<script>
	import { getUsers, getEquipment, addUser, addEquipment, generateNextClnNumber, bulkAddEquipment, formatCount } from '$lib/data.js';
	
	// Centralna konfiguracja aplikacji
	const APP_CONFIG = {
		tabs: [
			{ id: 'manual', label: '✍️ Ręczne dodawanie', icon: '✍️' },
			{ id: 'csv', label: '📄 Import z CSV', icon: '📄' }
		],
		equipmentTypes: ['Komputer', 'Monitor', 'Drukarka', 'Myszka', 'Klawiatura', 'Zasilacz', 'Stacja dokująca', 'YubiKey'],
		csvFormats: {
			users: {
				title: 'Format pliku CSV:',
				headers: 'name,email',
				example: 'Jan Kowalski,jan.kowalski@firma.pl',
				required: ['name', 'email']
			},
			equipment: {
				title: 'Format pliku CSV:',
				headers: 'name,type,serialnumber,clnnumber,inventorynumber,roomlocation,damaged',
				examples: [
					'Dell Latitude 5520,Komputer,DL123456789,CLN00001,INV001,,false',
					'LG 27",Monitor,LG123456789,,INV002,Pokój 101,false',
					'HP LaserJet,Drukarka,HP987654321,,INV003,Pokój 203,true',
					'YubiKey 5 NFC,YubiKey,YK567890123,,INV004,,false'
				],
				required: ['name', 'type', 'serialnumber'],
				optional: ['clnnumber', 'inventorynumber', 'roomlocation', 'damaged']
			}
		},
		formFields: {
			user: {
				name: { label: 'Imię i nazwisko:', placeholder: 'Jan Kowalski', type: 'text' },
				email: { label: 'Email:', placeholder: 'jan.kowalski@firma.pl', type: 'email' }
			},
			equipment: {
				name: { label: 'Nazwa sprzętu:', placeholder: 'HP EliteBook 840 G6', type: 'text' },
				type: { label: 'Typ sprzętu:', type: 'select' },
				serialNumber: { label: 'Numer seryjny:', placeholder: 'DL123456789', type: 'text' },
				clnNumber: { label: 'Numer CLN', placeholder: 'CLN000000', type: 'text', optional: true, showFor: ['Komputer'] },
				inventoryNumber: { label: 'Numer inwentarzowy', placeholder: 'INV001', type: 'text', optional: true },
				roomLocation: { label: 'Lokalizacja/Pokój', placeholder: 'Pokój 101, Sala konferencyjna A, Recepcja...', type: 'text', optional: true, showFor: ['Monitor', 'Drukarka'] },
				damaged: { label: 'Sprzęt uszkodzony', type: 'checkbox', optional: true }
			}
		},
		messages: {
			autoHideDelay: 5000,
			types: {
				success: { icon: '✅', bgClass: 'bg-green-50', textClass: 'text-green-700' },
				error: { icon: '❌', bgClass: 'bg-red-50', textClass: 'text-red-700' },
				loading: { icon: '⏳', bgClass: 'bg-yellow-50', textClass: 'text-yellow-700' },
				info: { icon: 'ℹ️', bgClass: 'bg-blue-50', textClass: 'text-blue-700' }
			}
		}
	};
	
	// State management with Svelte 5 runes
	let usersCount = $state(0);
	let equipmentCount = $state(0);
	let isLoading = $state(true);
	let isImporting = $state(false);
	
	// Form states
	let activeUserTab = $state('manual');
	let activeEquipmentTab = $state('manual');
	
	let newUser = $state({ name: '', email: '' });
	let newEquipment = $state({
		name: '', type: '', serialNumber: '', clnNumber: '', 
		inventoryNumber: '', roomLocation: '', damaged: false
	});
	
	// Messages
	let userMessage = $state('');
	let equipmentMessage = $state('');

	// Derived computations
	const shouldShowRoomLocation = $derived(
		newEquipment.type === 'Monitor' || newEquipment.type === 'Drukarka'
	);
	
	const shouldShowClnNumber = $derived(
		newEquipment.type === 'Komputer'
	);

	// Effects
	$effect(() => {
		loadData();
	});
	
	$effect(() => {
		if (isImporting) {
			console.log('Import w toku - blokowanie interfejsu');
		}
	});

	// Utility functions for UI
	/**
	 * @param {string} message
	 * @returns {'success' | 'error' | 'loading' | 'info'}
	 */
	function getMessageType(message) {
		if (message.includes('✅')) return 'success';
		if (message.includes('❌')) return 'error';
		if (message.includes('⏳')) return 'loading';
		return 'info';
	}

	/**
	 * @param {string} message
	 * @returns {string}
	 */
	function getMessageClasses(message) {
		const messageType = getMessageType(message);
		const config = APP_CONFIG.messages.types[messageType];
		return `mt-4 p-3 rounded-md ${config.bgClass}`;
	}

	/**
	 * @param {string} message
	 * @returns {string}
	 */
	function getTextClasses(message) {
		const messageType = getMessageType(message);
		const config = APP_CONFIG.messages.types[messageType];
		return `text-sm whitespace-pre-line ${config.textClass}`;
	}

	/**
	 * @param {string} activeTab
	 * @param {string} tabId
	 * @returns {string}
	 */
	function getTabClasses(activeTab, tabId) {
		const baseClasses = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors';
		return activeTab === tabId 
			? `${baseClasses} bg-green-600 text-white`
			: `${baseClasses} text-gray-600`;
	}

	/**
	 * @param {'user' | 'equipment'} messageType
	 */
	function autoHideMessage(messageType) {
		setTimeout(() => {
			if (messageType === 'user') {
				userMessage = '';
			} else if (messageType === 'equipment') {
				equipmentMessage = '';
			}
		}, APP_CONFIG.messages.autoHideDelay);
	}

	/**
	 * @param {'user' | 'equipment'} tabType
	 * @param {string} tabId
	 */
	function switchTab(tabType, tabId) {
		if (tabType === 'user') {
			activeUserTab = tabId;
			userMessage = '';
		} else {
			activeEquipmentTab = tabId;
			equipmentMessage = '';
		}
	}
	// Form management
	function clearUserForm() {
		newUser = { name: '', email: '' };
	}
	
	function clearEquipmentForm() {
		newEquipment = { 
			name: '', type: '', serialNumber: '', clnNumber: '', 
			inventoryNumber: '', roomLocation: '', damaged: false
		};
	}
	
	// Data loading and form handling functions
	async function loadData() {
		if (isImporting) return;
		
		try {
			isLoading = true;
			const [users, equipment] = await Promise.all([getUsers(), getEquipment()]);
			usersCount = users.length;
			equipmentCount = equipment.length;
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * @param {string} name
	 * @param {string} email
	 * @returns {Promise<boolean>}
	 */
	async function validateAndAddUser(name, email) {
		if (!name.trim() || !email.trim()) {
			userMessage = '❌ Wymagane pola: imię i nazwisko oraz email';
			autoHideMessage('user');
			return false;
		}
		
		// Check if email already exists
		const users = await getUsers();
		if (users.some(user => user.email === email)) {
			userMessage = '❌ Użytkownik z tym emailem już istnieje';
			autoHideMessage('user');
			return false;
		}
		
		const success = await addUser(name.trim(), email.trim());
		if (success) {
			userMessage = '✅ Użytkownik został dodany pomyślnie';
			autoHideMessage('user');
			await loadData();
			return true;
		} else {
			userMessage = '❌ Błąd podczas dodawania użytkownika';
			autoHideMessage('user');
			return false;
		}
	}

	/**
	 * @param {Object} equipmentData
	 * @param {string} equipmentData.name
	 * @param {string} equipmentData.type
	 * @param {string} equipmentData.serialNumber
	 * @param {string} equipmentData.clnNumber
	 * @param {string} equipmentData.inventoryNumber
	 * @param {string} equipmentData.roomLocation
	 * @returns {Promise<boolean>}
	 */
	async function validateAndAddEquipment(equipmentData) {
		const { name, type, serialNumber, clnNumber, inventoryNumber, roomLocation } = equipmentData;
		
		if (!name.trim() || !type || !serialNumber.trim()) {
			equipmentMessage = '❌ Wymagane pola: nazwa sprzętu, typ sprzętu i numer seryjny';
			autoHideMessage('equipment');
			return false;
		}

		// Auto-generate CLN for computers if not provided
		let finalClnNumber = clnNumber.trim();
		if (type === 'Komputer' && !finalClnNumber) {
			finalClnNumber = await generateNextClnNumber();
		}
		
		// Check if serial number already exists
		const equipment = await getEquipment();
		if (equipment.some(item => item.serialNumber === serialNumber)) {
			equipmentMessage = '❌ Sprzęt z tym numerem seryjnym już istnieje';
			autoHideMessage('equipment');
			return false;
		}
		
		const success = await addEquipment(
			name.trim(), 
			type, 
			serialNumber.trim(), 
			finalClnNumber, 
			inventoryNumber.trim(), 
			roomLocation.trim(),
			newEquipment.damaged
		);
		
		if (success) {
			equipmentMessage = '✅ Sprzęt został dodany pomyślnie';
			autoHideMessage('equipment');
			await loadData();
			return true;
		} else {
			equipmentMessage = '❌ Błąd podczas dodawania sprzętu';
			autoHideMessage('equipment');
			return false;
		}
	}

	async function handleAddUser() {
		const success = await validateAndAddUser(newUser.name, newUser.email);
		if (success) {
			clearUserForm();
		}
	}
	
	async function handleAddEquipment() {
		const success = await validateAndAddEquipment(newEquipment);
		if (success) {
			clearEquipmentForm();
		}
	}

	// CSV processing functions
	/**
	 * @param {string} csvText
	 * @returns {Array<Array<string>>}
	 */
	function parseCSV(csvText) {
		const lines = [];
		const rows = csvText.split('\n');
		
		console.log(`Parser CSV: Znaleziono ${rows.length} wierszy do parsowania`);
		
		for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			const row = rows[rowIndex];
			if (!row.trim()) {
				console.log(`Parser CSV: Pominięto pusty wiersz ${rowIndex + 1}`);
				continue;
			}
			
			const cells = [];
			let current = '';
			let inQuotes = false;
			
			for (let i = 0; i < row.length; i++) {
				const char = row[i];
				
				if (char === '"' && (i === 0 || row[i-1] === ',')) {
					inQuotes = true;
				} else if (char === '"' && inQuotes && (i === row.length - 1 || row[i+1] === ',')) {
					inQuotes = false;
				} else if (char === ',' && !inQuotes) {
					cells.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}
			cells.push(current.trim());
			
			console.log(`Parser CSV: Wiersz ${rowIndex + 1}: ${cells.length} kolumn`, cells);
			lines.push(cells);
		}
		
		console.log(`Parser CSV: Ostatecznie sparsowano ${lines.length} wierszy`);
		return lines;
	}

	/**
	 * @param {Event} event
	 */
	async function handleUserCsvUpload(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		const file = target?.files?.[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const csv = /** @type {string} */ (e.target?.result);
				if (!csv || typeof csv !== 'string') {
					userMessage = '❌ Błąd podczas czytania pliku';
					return;
				}
				
				const lines = csv.split('\n').filter(/** @param {string} line */ line => line.trim());
				const headers = lines[0].toLowerCase().split(',').map(/** @param {string} h */ h => h.trim());
				
				if (!headers.includes('name') || !headers.includes('email')) {
					userMessage = '❌ Plik CSV musi zawierać kolumny: name, email';
					return;
				}
				
				const users = await getUsers();
				let added = 0;
				let skipped = 0;
				
				for (let i = 1; i < lines.length; i++) {
					const values = lines[i].split(',').map(/** @param {string} v */ v => v.trim());
					const nameIndex = headers.indexOf('name');
					const emailIndex = headers.indexOf('email');
					
					const name = values[nameIndex];
					const email = values[emailIndex];
					
					if (name && email && !users.some(user => user.email === email)) {
						const success = await addUser(name, email);
						if (success) added++;
						else skipped++;
					} else {
						skipped++;
					}
				}
				
				userMessage = `✅ Dodano ${added} użytkowników, pominięto ${skipped}`;
				autoHideMessage('user');
				await loadData(); // Reload data to update counters
			} catch (error) {
				userMessage = '❌ Błąd podczas czytania pliku CSV';
				autoHideMessage('user');
			}
		};
		reader.readAsText(file);
	}
	
	/**
	 * @param {Event} event
	 */
	async function handleEquipmentCsvUpload(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		const file = target?.files?.[0];
		if (!file) return;
		
		isImporting = true;
		equipmentMessage = '⏳ Importowanie pliku CSV...';
		
		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const csv = /** @type {string} */ (e.target?.result);
				if (!csv || typeof csv !== 'string') {
					equipmentMessage = '❌ Błąd podczas czytania pliku';
					isImporting = false;
					return;
				}
				
				const lines = parseCSV(csv);
				if (lines.length === 0) {
					equipmentMessage = '❌ Plik CSV jest pusty';
					isImporting = false;
					return;
				}
				
				console.log(`Znaleziono ${lines.length} wierszy w pliku CSV`);
				
				const headers = lines[0].map(h => h.toLowerCase().replace(/"/g, '').trim());
				console.log('Znalezione nagłówki:', headers);
				
				if (!headers.includes('name') || !headers.includes('type') || !headers.includes('serialnumber')) {
					equipmentMessage = `❌ Plik CSV musi zawierać kolumny: name, type, serialnumber (opcjonalnie: clnnumber, inventorynumber, roomlocation, damaged).\nZnalezione kolumny: ${headers.join(', ')}`;
					isImporting = false;
					return;
				}
				
				const result = await processEquipmentCSV(lines, headers);
				equipmentMessage = result.message;
				await loadData();
				isImporting = false;
			} catch (error) {
				console.error('CSV import error:', error);
				equipmentMessage = `❌ Błąd podczas czytania pliku CSV: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
				isImporting = false;
			}
		};
		reader.readAsText(file);
	}

	/**
	 * @param {Array<Array<string>>} lines
	 * @param {Array<string>} headers
	 * @returns {Promise<{message: string}>}
	 */
	async function processEquipmentCSV(lines, headers) {
		// Column indices
		const nameIndex = headers.indexOf('name');
		const typeIndex = headers.indexOf('type');
		const serialIndex = headers.indexOf('serialnumber');
		const clnIndex = headers.indexOf('clnnumber');
		const inventoryIndex = headers.indexOf('inventorynumber');
		const roomLocationIndex = headers.indexOf('roomlocation');
		const damagedIndex = headers.indexOf('damaged');
		
		console.log('Indeksy kolumn:', {
			nameIndex, typeIndex, serialIndex, clnIndex, inventoryIndex, roomLocationIndex, damagedIndex
		});
		
		const equipment = await getEquipment();
		const existingSerialNumbers = new Set(equipment.map(item => item.serialNumber));
		const processedSerialNumbers = new Set();
		
		let added = 0;
		let skipped = 0;
		let errors = [];
		let processed = 0;
		
		console.log(`Rozpoczęcie importu ${lines.length - 1} wierszy...`);
		equipmentMessage = `⏳ Przetwarzanie ${lines.length - 1} wierszy...`;
		
		// Prepare all data for import
		const itemsToImport = [];
		for (let i = 1; i < lines.length; i++) {
			const values = lines[i];
			processed++;
			
			console.log(`\n=== Przygotowywanie wiersza ${i + 1}/${lines.length} ===`);
			
			const requiredColumns = Math.max(nameIndex, typeIndex, serialIndex) + 1;
			if (values.length < requiredColumns) {
				console.log(`Wiersz ${i + 1}: Za mało kolumn (${values.length} < ${requiredColumns})`);
				skipped++;
				errors.push(`Wiersz ${i + 1}: Niewystarczająca liczba kolumn`);
				continue;
			}
			
			const name = values[nameIndex]?.replace(/"/g, '').trim();
			const type = values[typeIndex]?.replace(/"/g, '').trim();
			const serialNumber = values[serialIndex]?.replace(/"/g, '').trim();
			const clnNumber = clnIndex >= 0 && values[clnIndex] ? values[clnIndex].replace(/"/g, '').trim() : '';
			const inventoryNumber = inventoryIndex >= 0 && values[inventoryIndex] ? values[inventoryIndex].replace(/"/g, '').trim() : '';
			const roomLocation = roomLocationIndex >= 0 && values[roomLocationIndex] ? values[roomLocationIndex].replace(/"/g, '').trim() : '';
			const damaged = damagedIndex >= 0 && values[damagedIndex] ? 
				(values[damagedIndex].replace(/"/g, '').trim().toLowerCase() === 'true' || 
				 values[damagedIndex].replace(/"/g, '').trim() === '1' ||
				 values[damagedIndex].replace(/"/g, '').trim().toLowerCase() === 'tak') : false;

			// Validation
			if (!name || !type || !serialNumber) {
				console.log(`Wiersz ${i + 1}: Brakujące dane`);
				skipped++;
				errors.push(`Wiersz ${i + 1}: Brakujące wymagane dane`);
				continue;
			}
			
			// Check duplicates
			if (existingSerialNumbers.has(serialNumber) || processedSerialNumbers.has(serialNumber)) {
				console.log(`Wiersz ${i + 1}: Duplikat numeru seryjnego: ${serialNumber}`);
				skipped++;
				errors.push(`Wiersz ${i + 1} (${name}): Duplikat numeru seryjnego`);
				continue;
			}
			
			itemsToImport.push({
				name,
				type,
				serialNumber,
				clnNumber,
				inventoryNumber,
				roomLocation,
				damaged
			});
			
			processedSerialNumbers.add(serialNumber);
		}
		
		console.log(`Przygotowano ${formatCount(itemsToImport.length, 'item')} do importu`);
		
		// Use bulk import
		equipmentMessage = `⏳ Importowanie ${formatCount(itemsToImport.length, 'item')} przez bulk API...`;
		console.log(`Wywołanie bulkAddEquipment z ${itemsToImport.length} pozycjami`);
		
		const bulkResult = await bulkAddEquipment(itemsToImport);
		
		if (bulkResult.success && bulkResult.results) {
			const results = bulkResult.results;
			added = results.summary.added;
			skipped = results.summary.skipped + results.summary.errors;
			
			// Collect errors from bulk import
			errors = [];
			if (results.results.skipped) {
				results.results.skipped.forEach(/** @param {any} item */ item => {
					errors.push(`${item.item.name} (${item.item.serialNumber}): ${item.reason}`);
				});
			}
			if (results.results.errors) {
				results.results.errors.forEach(/** @param {any} item */ item => {
					errors.push(`${item.item.name} (${item.item.serialNumber}): ${item.error}`);
				});
			}
			
			console.log(`Bulk import zakończony: dodano ${added}, pominięto ${skipped}`);
		} else {
			console.error('Bulk import nie powiódł się:', bulkResult.error);
			errors.push(bulkResult.error || 'Nieznany błąd bulk importu');
			skipped = itemsToImport.length;
		}
		
		let message = `✅ Dodano ${formatCount(added, 'equipment')}, pominięto ${skipped} z ${lines.length - 1} wierszy (przetworzono ${processed} wierszy)`;
		
		if (errors.length > 0 && errors.length <= 10) {
			message += `\n\nBłędy:\n${errors.join('\n')}`;
		} else if (errors.length > 10) {
			message += `\n\nBłędy (pierwsze 10):\n${errors.slice(0, 10).join('\n')}\n... i ${errors.length - 10} więcej`;
		}
		
		console.log(`Import zakończony. Statystyki:`, {
			totalRows: lines.length - 1,
			processed: processed,
			added: added,
			skipped: skipped,
			errors: errors.length
		});
		
		return { message };
	}
</script>

<div class="px-2 py-6 sm:px-4 lg:px-6 xl:px-8 2xl:px-12">
	<div class="border-4 border-dashed border-green-200 rounded-lg p-4 sm:p-6 lg:p-8">
		<h1 class="text-2xl lg:text-3xl font-bold text-green-800 mb-8">📥 Import Danych</h1>
		<p class="text-green-600 mb-8">Dodaj nowych użytkowników i sprzęt do systemu ręcznie lub importuj z pliku CSV</p>
		
		<div class="grid grid-cols-1 2xl:grid-cols-2 gap-6 lg:gap-8">
			<!-- User Import Section -->
			<div class="bg-white rounded-lg shadow-sm border border-green-200 p-6">
				<h2 class="text-2xl font-bold text-green-800 mb-6 flex items-center">
					👥 Import Użytkowników
				</h2>
				
				<!-- User Tabs -->
				<div class="flex mb-6 bg-gray-100 rounded-lg p-1">
					{#each APP_CONFIG.tabs as tab}
						<button
							class={getTabClasses(activeUserTab, tab.id)}
							onclick={() => switchTab('user', tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
				
				{#if activeUserTab === 'manual'}
					<!-- Manual User Entry -->
					<div class="space-y-4">
						<div>
							<label for="user-name" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.user.name.label}
							</label>
							<input
								id="user-name"
								type={APP_CONFIG.formFields.user.name.type}
								bind:value={newUser.name}
								placeholder={APP_CONFIG.formFields.user.name.placeholder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>
						
						<div>
							<label for="user-email" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.user.email.label}
							</label>
							<input
								id="user-email"
								type={APP_CONFIG.formFields.user.email.type}
								bind:value={newUser.email}
								placeholder={APP_CONFIG.formFields.user.email.placeholder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>
						
						<button
							onclick={handleAddUser}
							class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
						>
							<span>➕</span>
							<span>Dodaj użytkownika</span>
						</button>
					</div>
				{:else}
					<!-- CSV User Import -->
					<div class="space-y-4">
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
							<h4 class="text-sm font-medium text-blue-800 mb-2">{APP_CONFIG.csvFormats.users.title}</h4>
							<p class="text-sm text-blue-700 mb-2">Plik powinien zawierać nagłówki: <code class="bg-blue-100 px-1 rounded">{APP_CONFIG.csvFormats.users.headers}</code></p>
							<p class="text-xs text-blue-600">Przykład: {APP_CONFIG.csvFormats.users.example}</p>
						</div>
						
						<div>
							<label for="users-csv" class="block text-sm font-medium text-gray-700 mb-2">
								Wybierz plik CSV:
							</label>
							<input
								id="users-csv"
								type="file"
								accept=".csv"
								onchange={handleUserCsvUpload}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>
					</div>
				{/if}
				
				{#if userMessage}
					<div class={getMessageClasses(userMessage)}>
						<p class={getTextClasses(userMessage)}>
							{userMessage}
						</p>
					</div>
				{/if}
			</div>
			
			<!-- Equipment Import Section -->
			<div class="bg-white rounded-lg shadow-sm border border-green-200 p-6">
				<h2 class="text-2xl font-bold text-green-800 mb-6 flex items-center">
					📦 Import Sprzętu
				</h2>
				
				<!-- Equipment Tabs -->
				<div class="flex mb-6 bg-gray-100 rounded-lg p-1">
					{#each APP_CONFIG.tabs as tab}
						<button
							class={getTabClasses(activeEquipmentTab, tab.id)}
							onclick={() => switchTab('equipment', tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
				
				{#if activeEquipmentTab === 'manual'}
					<!-- Manual Equipment Entry -->
					<div class="space-y-4">
						<div>
							<label for="equipment-name" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.equipment.name.label}
							</label>
							<input
								id="equipment-name"
								type={APP_CONFIG.formFields.equipment.name.type}
								bind:value={newEquipment.name}
								placeholder={APP_CONFIG.formFields.equipment.name.placeholder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>
						
						<div>
							<label for="equipment-type" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.equipment.type.label}
							</label>
							<select
								id="equipment-type"
								bind:value={newEquipment.type}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							>
								<option value="">-- Wybierz typ --</option>
								{#each APP_CONFIG.equipmentTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
						
						<div>
							<label for="equipment-serialNumber" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.equipment.serialNumber.label}
							</label>
							<input
								id="equipment-serialNumber"
								type={APP_CONFIG.formFields.equipment.serialNumber.type}
								bind:value={newEquipment.serialNumber}
								placeholder={APP_CONFIG.formFields.equipment.serialNumber.placeholder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>

						<div>
							<label for="equipment-inventoryNumber" class="block text-sm font-medium text-gray-700 mb-2">
								{APP_CONFIG.formFields.equipment.inventoryNumber.label} <span class="text-gray-400">(opcjonalny)</span>:
							</label>
							<input
								id="equipment-inventoryNumber"
								type={APP_CONFIG.formFields.equipment.inventoryNumber.type}
								bind:value={newEquipment.inventoryNumber}
								placeholder={APP_CONFIG.formFields.equipment.inventoryNumber.placeholder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
							<p class="text-xs text-gray-500 mt-1">Opcjonalny numer inwentarzowy sprzętu</p>
						</div>

						{#if shouldShowRoomLocation}
							<div>
								<label for="equipment-roomLocation" class="block text-sm font-medium text-gray-700 mb-2">
									{APP_CONFIG.formFields.equipment.roomLocation.label} <span class="text-gray-400">(opcjonalny)</span>:
								</label>
								<input
									id="equipment-roomLocation"
									type={APP_CONFIG.formFields.equipment.roomLocation.type}
									bind:value={newEquipment.roomLocation}
									placeholder={APP_CONFIG.formFields.equipment.roomLocation.placeholder}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
								/>
								<p class="text-xs text-gray-500 mt-1">Lokalizacja gdzie znajduje się monitor/drukarka</p>
							</div>
						{/if}

						{#if shouldShowClnNumber}
							<div>
								<label for="equipment-clnNumber" class="block text-sm font-medium text-gray-700 mb-2">
									{APP_CONFIG.formFields.equipment.clnNumber.label} <span class="text-gray-400">(opcjonalny)</span>:
								</label>
								<input
									id="equipment-clnNumber"
									type={APP_CONFIG.formFields.equipment.clnNumber.type}
									bind:value={newEquipment.clnNumber}
									placeholder={APP_CONFIG.formFields.equipment.clnNumber.placeholder}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
								/>
							</div>
						{/if}
						
						<button
							onclick={handleAddEquipment}
							class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
						>
							<span>➕</span>
							<span>Dodaj sprzęt</span>
						</button>
					</div>
				{:else}
					<!-- CSV Equipment Import -->
					<div class="space-y-4">
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
							<h4 class="text-sm font-medium text-blue-800 mb-2">{APP_CONFIG.csvFormats.equipment.title}</h4>
							<p class="text-sm text-blue-700 mb-2">Plik powinien zawierać nagłówki: <code class="bg-blue-100 px-1 rounded">{APP_CONFIG.csvFormats.equipment.headers}</code></p>
							{#each APP_CONFIG.csvFormats.equipment.examples as example}
								<p class="text-xs text-blue-600 mb-1">Przykład: {example}</p>
							{/each}
							<p class="text-xs text-blue-600">💡 Kolumny {APP_CONFIG.csvFormats.equipment.optional.join(', ')} są opcjonalne. Lokalizacja jest używana tylko dla monitorów i drukarek. Kolumna damaged może zawierać: true/false, 1/0, tak/nie.</p>
						</div>
						
						<div>
							<label for="equipment-csv" class="block text-sm font-medium text-gray-700 mb-2">
								Wybierz plik CSV:
							</label>
							<input
								id="equipment-csv"
								type="file"
								accept=".csv"
								onchange={handleEquipmentCsvUpload}
								disabled={isImporting}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							{#if isImporting}
								<p class="text-sm text-green-600 mt-2">🚀 Import w toku... Proszę czekać</p>
							{/if}
						</div>
					</div>
				{/if}
				
				{#if equipmentMessage}
					<div class={getMessageClasses(equipmentMessage)}>
						<p class={getTextClasses(equipmentMessage)}>
							{equipmentMessage}
						</p>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Statistics -->
		<div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-green-50 border border-green-200 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-green-800 mb-2">👥 Użytkownicy w systemie</h3>
				{#if isLoading}
					<div class="animate-pulse">
						<div class="h-8 bg-green-200 rounded w-16"></div>
					</div>
				{:else}
					<p class="text-3xl font-bold text-green-600">{usersCount}</p>
				{/if}
			</div>
			
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-blue-800 mb-2">📦 Pozycje sprzętu</h3>
				{#if isLoading}
					<div class="animate-pulse">
						<div class="h-8 bg-blue-200 rounded w-16"></div>
					</div>
				{:else}
					<p class="text-3xl font-bold text-blue-600">{equipmentCount}</p>
				{/if}
			</div>
		</div>
	</div>
</div>
