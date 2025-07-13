<script>
	import { getUsers, getEquipment, getHistory, forceRefreshAllData, formatCount } from '$lib/data.js';
	
	/**
	 * Format message with count placeholder replacement and pluralization
	 * @param {string} template
	 * @param {number} count
	 * @param {number} usersCount
	 * @param {number} equipmentCount
	 * @param {string} sectionId - ID of the section to determine pluralization pattern
	 * @returns {string}
	 */
	function formatMessage(template, count, usersCount = 0, equipmentCount = 0, sectionId = '') {
		let formattedCount = count.toString();
		
		// Apply pluralization based on section type
		switch(sectionId) {
			case 'users':
				formattedCount = formatCount(count, 'user');
				break;
			case 'equipment':
				formattedCount = formatCount(count, 'equipment');
				break;
			case 'history':
				formattedCount = formatCount(count, 'history');
				break;
			case 'documents':
				formattedCount = formatCount(count, 'document');
				break;
			default:
				formattedCount = count.toString();
		}
		
		return template
			.replace(/{count}/g, formattedCount)
			.replace(/{usersCount}/g, formatCount(usersCount, 'user'))
			.replace(/{equipmentCount}/g, formatCount(equipmentCount, 'equipment'));
	}

	// Centralna konfiguracja aplikacji
	const ADMIN_CONFIG = {
		sections: [
			{
				id: 'users',
				title: '👥 Zarządzanie Użytkownikami',
				icon: '👥',
				deleteIcon: '🗑️',
				description: 'Usuń wszystkich użytkowników z bazy danych. Sprzęt przypisany do użytkowników zostanie automatycznie odłączony.',
				endpoint: '/api/users/deleteAll',
				confirmMessage: 'Czy na pewno chcesz usunąć wszystkich {count} użytkowników?',
				buttonText: 'Usuń wszystkich użytkowników ({count})',
				successMessage: 'Usunięto {count} użytkowników',
				loadingMessage: 'Usuwanie wszystkich użytkowników...',
				errorMessage: 'Błąd podczas usuwania użytkowników',
				statsLabel: 'Użytkownicy w systemie',
				statsColor: 'blue'
			},
			{
				id: 'equipment',
				title: '📦 Zarządzanie Sprzętem',
				icon: '📦',
				deleteIcon: '🗑️',
				description: 'Usuń cały sprzęt z bazy danych. Wszystkie przypisania użytkowników zostaną automatycznie usunięte.',
				endpoint: '/api/equipment/deleteAll',
				confirmMessage: 'Czy na pewno chcesz usunąć cały sprzęt ({count})?',
				buttonText: 'Usuń cały sprzęt ({count})',
				successMessage: 'Usunięto {count}',
				loadingMessage: 'Usuwanie całego sprzętu...',
				errorMessage: 'Błąd podczas usuwania sprzętu',
				statsLabel: 'Pozycje sprzętu',
				statsColor: 'green'
			},
			{
				id: 'history',
				title: '📜 Zarządzanie Historią',
				icon: '📜',
				deleteIcon: '🗑️',
				description: 'Usuń całą historię zdarzeń sprzętu z bazy danych. Dane sprzętu i użytkowników pozostaną nienaruszone.',
				endpoint: '/api/history/deleteAll',
				confirmMessage: 'Czy na pewno chcesz usunąć całą historię ({count} wpisów)?',
				buttonText: 'Usuń całą historię ({count})',
				successMessage: 'Usunięto {count} wpisów z historii',
				loadingMessage: 'Usuwanie całej historii...',
				errorMessage: 'Błąd podczas usuwania historii',
				statsLabel: 'Wpisy w historii',
				statsColor: 'purple'
			},
			{
				id: 'documents',
				title: '📄 Zarządzanie Dokumentami',
				icon: '📄',
				deleteIcon: '🗂️',
				description: 'Usuń wszystkie dokumenty z systemu. Fizycznie usuwa pliki z dysku oraz czyści bazę danych. Użytkownicy i sprzęt pozostaną nienaruszone.',
				endpoint: '/api/documents/deleteAll',
				confirmMessage: 'Czy na pewno chcesz usunąć wszystkie dokumenty ({count})?',
				buttonText: 'Usuń wszystkie dokumenty ({count})',
				successMessage: 'Usunięto {count} dokumentów',
				loadingMessage: 'Usuwanie wszystkich dokumentów...',
				errorMessage: 'Błąd podczas usuwania dokumentów',
				statsLabel: 'Dokumenty',
				statsColor: 'orange',
				extraWarning: 'Ta operacja jest nieodwracalna i fizycznie usuwa pliki z dysku!'
			}
		],
		resetAll: {
			id: 'all',
			title: '💥 Reset Kompletny',
			icon: '💥',
			description: 'Usuń wszystkie dane z systemu: użytkowników, sprzęt, przypisania, historię i dokumenty. Przywróć system do stanu początkowego.',
			confirmMessage: 'UWAGA! NIEBEZPIECZNA OPERACJA!\nUsuniesz WSZYSTKIE dane: {usersCount} użytkowników i {equipmentCount} pozycji sprzętu.\nTa operacja jest NIEODWRACALNA!',
			buttonText: 'RESET KOMPLETNY',
			successMessage: 'Wszystkie dane zostały usunięte z bazy',
			loadingMessage: 'Usuwanie wszystkich danych z bazy...',
			errorMessage: 'Błąd podczas usuwania wszystkich danych',
			buttonClass: 'bg-red-800 hover:bg-red-900',
			confirmClass: 'bg-red-100 border-red-300',
			confirmTextClass: 'text-red-900 font-bold'
		},
		ui: {
			loadingDelay: 300,
			messageTypes: {
				success: { icon: '✅', bg: 'bg-green-50', text: 'text-green-700' },
				error: { icon: '❌', bg: 'bg-red-50', text: 'text-red-700' },
				loading: { icon: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-700' }
			},
			colors: {
				blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', number: 'text-blue-600', pulse: 'bg-blue-200' },
				green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', number: 'text-green-600', pulse: 'bg-green-200' },
				orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', number: 'text-orange-600', pulse: 'bg-orange-200' },
				purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', number: 'text-purple-600', pulse: 'bg-purple-200' },
				red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', number: 'text-red-600', pulse: 'bg-red-200' },
				indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', number: 'text-indigo-600', pulse: 'bg-indigo-200' }
			}
		}
	};

	// Types
	/** @typedef {{id: string, title: string, icon: string, deleteIcon: string, description: string, endpoint: string, confirmMessage: string, buttonText: string, successMessage: string, loadingMessage: string, errorMessage: string, statsLabel: string, statsColor: string, extraWarning?: string}} Section */
	/** @typedef {'users' | 'equipment' | 'history' | 'documents'} SectionId */
	/** @typedef {'blue' | 'green' | 'orange' | 'purple' | 'red' | 'indigo'} ColorKey */
	
	// State management with Svelte 5 runes
	let counts = $state(/** @type {Record<SectionId, number>} */ ({
		users: 0,
		equipment: 0,
		history: 0,
		documents: 0
	}));
	let isLoading = $state(true);
	let messages = $state(/** @type {Record<SectionId | 'general', string>} */ ({
		users: '',
		equipment: '',
		history: '',
		documents: '',
		general: ''
	}));
	let confirmStates = $state(/** @type {Record<SectionId | 'all', boolean>} */ ({
		users: false,
		equipment: false,
		history: false,
		documents: false,
		all: false
	}));
	
	// Load initial data
	$effect(() => {
		loadData();
	});
	
	// Utility functions - DRY helpers
	/**
	 * Get message style classes based on message content
	 * @param {string} message
	 * @returns {{bg: string, text: string}}
	 */
	function getMessageStyle(message) {
		if (message.includes('✅')) return ADMIN_CONFIG.ui.messageTypes.success;
		if (message.includes('❌')) return ADMIN_CONFIG.ui.messageTypes.error;
		if (message.includes('⏳')) return ADMIN_CONFIG.ui.messageTypes.loading;
		return ADMIN_CONFIG.ui.messageTypes.error;
	}
	
	/**
	 * Make API call to delete endpoint
	 * @param {string} endpoint
	 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
	 */
	async function makeDeleteRequest(endpoint) {
		try {
			const response = await fetch(endpoint, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (response.ok) {
				const result = await response.json();
				return { success: true, result };
			} else {
				const error = await response.text();
				return { success: false, error };
			}
		} catch (error) {
			console.error(`Error calling ${endpoint}:`, error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return { success: false, error: errorMessage };
		}
	}
	
	/**
	 * Generic delete section handler
	 * @param {Section} section
	 */
	async function deleteSection(section) {
		try {
			const sectionId = /** @type {SectionId} */ (section.id);
			const count = counts[sectionId];
			messages[sectionId] = `⏳ ${section.loadingMessage}`;
			
			const { success, result, error } = await makeDeleteRequest(section.endpoint);
			
			if (success) {
				const deletedCount = result?.deletedCount || count;
				messages[sectionId] = `✅ ${formatMessage(section.successMessage, deletedCount, 0, 0, sectionId)}`;
				console.log(`Admin: Deleted ${section.id}, refreshing data...`);
				await loadData();
			} else {
				messages[sectionId] = `❌ ${section.errorMessage}: ${error}`;
			}
		} catch (error) {
			console.error(`Error deleting ${section.id}:`, error);
			const sectionId = /** @type {SectionId} */ (section.id);
			messages[sectionId] = `❌ ${section.errorMessage}`;
		}
		const sectionId = /** @type {SectionId} */ (section.id);
		confirmStates[sectionId] = false;
	}

	async function loadData() {
		try {
			isLoading = true;
			console.log('Admin: Odświeżanie danych...');
			
			// Wymuś odświeżenie wszystkich cache'ów
			await forceRefreshAllData();
			
			const [users, equipment, history, documentsResponse] = await Promise.all([
				getUsers(),
				getEquipment(),
				getHistory(),
				fetch('/api/documents')
			]);
			
			const documents = documentsResponse.ok ? await documentsResponse.json() : [];
			
			// Krótkie opóźnienie dla UX
			await new Promise(resolve => setTimeout(resolve, ADMIN_CONFIG.ui.loadingDelay));
			
			counts.users = users.length;
			counts.equipment = equipment.length;
			counts.history = history.length;
			counts.documents = documents.length;
			
			console.log('Admin: Dane odświeżone:', counts);
		} catch (error) {
			console.error('Error loading data:', error);
			messages.general = '❌ Błąd podczas ładowania danych';
		} finally {
			isLoading = false;
		}
	}
	
	async function deleteAllData() {
		try {
			const resetConfig = ADMIN_CONFIG.resetAll;
			messages.general = `⏳ ${resetConfig.loadingMessage}`;
			
			// Usuń w odpowiedniej kolejności
			const endpoints = [
				'/api/equipment/deleteAll',
				'/api/users/deleteAll', 
				'/api/documents/deleteAll',
				'/api/history/deleteAll'
			];
			
			for (const endpoint of endpoints) {
				await makeDeleteRequest(endpoint);
			}
			
			messages.general = `✅ ${resetConfig.successMessage}`;
			console.log('Admin: Usunięto wszystkie dane, odświeżanie danych...');
			await loadData();
		} catch (error) {
			console.error('Error deleting all data:', error);
			messages.general = `❌ ${ADMIN_CONFIG.resetAll.errorMessage}`;
		}
		confirmStates.all = false;
	}
	
	function clearMessages() {
		messages.users = '';
		messages.equipment = '';
		messages.history = '';
		messages.documents = '';
		messages.general = '';
	}
	
	// ...existing code...
</script>

<div class="px-4 py-6 sm:px-0">
	<div class="border-4 border-dashed border-red-200 rounded-lg p-6">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-bold text-red-800 mb-2">⚙️ Panel Administracyjny</h1>
				<p class="text-red-600">⚠️ Uwaga: Operacje w tym panelu są nieodwracalne!</p>
			</div>
			<button
				onclick={clearMessages}
				class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
			>
				🗑️ Wyczyść komunikaty
			</button>
		</div>
		
		<!-- Statistics -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			{#each ADMIN_CONFIG.sections as section}
				{@const statsColor = /** @type {ColorKey} */ (section.statsColor)}
				{@const colors = ADMIN_CONFIG.ui.colors[statsColor]}
				{@const sectionId = /** @type {SectionId} */ (section.id)}
				<div class="{colors.bg} {colors.border} border rounded-lg p-6">
					<h3 class="text-lg font-semibold {colors.text} mb-2">{section.icon} {section.statsLabel}</h3>
					{#if isLoading}
						<div class="animate-pulse">
							<div class="h-8 {colors.pulse} rounded w-16"></div>
						</div>
					{:else}
						<p class="text-3xl font-bold {colors.number}">{counts[sectionId]}</p>
					{/if}
				</div>
			{/each}
		</div>
		
		<!-- Admin Actions -->
		<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6">
			<!-- Section Delete Cards -->
			{#each ADMIN_CONFIG.sections as section}
				{@const sectionId = /** @type {SectionId} */ (section.id)}
				<div class="bg-white rounded-lg shadow-sm border border-red-200 p-6 flex flex-col justify-between">
					<div>
						<h2 class="text-xl font-bold text-red-800 mb-4 flex items-center">
							{section.title}
						</h2>
						<p class="text-sm text-gray-600 mb-4">
							{section.description}
						</p>
					</div>
					
					<div class="mt-auto">
						{#if !confirmStates[sectionId]}
							<button
								onclick={() => confirmStates[sectionId] = true}
								disabled={counts[sectionId] === 0}
								class="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
							>
								<span>{section.deleteIcon}</span>
								<span>{formatMessage(section.buttonText, counts[sectionId], 0, 0, sectionId)}</span>
							</button>
						{:else}
							<div class="space-y-3">
								<div class="bg-red-50 border border-red-200 rounded-lg p-3">
									<p class="text-sm text-red-800 font-medium">
										⚠️ {formatMessage(section.confirmMessage, counts[sectionId], 0, 0, sectionId)}
									</p>
									<p class="text-xs text-red-600 mt-1">
										{section.extraWarning || 'Ta operacja jest nieodwracalna!'}
									</p>
								</div>
								<div class="flex space-x-2">
									<button
										onclick={() => deleteSection(section)}
										class="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
									>
										✅ Tak, usuń {section.id === 'documents' ? 'dokumenty' : section.id === 'users' ? 'wszystkich' : section.id === 'equipment' ? 'wszystko' : 'historię'}
									</button>
									<button
										onclick={() => confirmStates[sectionId] = false}
										class="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
									>
										❌ Anuluj
									</button>
								</div>
							</div>
						{/if}
						
						{#if messages[sectionId]}
							{@const style = getMessageStyle(messages[sectionId])}
							<div class="mt-4 p-3 rounded-md {style.bg}">
								<p class="text-sm {style.text}">
									{messages[sectionId]}
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
			
			<!-- Delete All Data Section -->
			<div class="bg-white rounded-lg shadow-sm border border-red-200 p-6 flex flex-col justify-between">
				<div>
					<h2 class="text-xl font-bold text-red-800 mb-4 flex items-center">
						{ADMIN_CONFIG.resetAll.title}
					</h2>
					<p class="text-sm text-gray-600 mb-4">
						{ADMIN_CONFIG.resetAll.description}
					</p>
				</div>
				
				<div class="mt-auto">
					{#if !confirmStates.all}
						<button
							onclick={() => confirmStates.all = true}
							disabled={counts.users === 0 && counts.equipment === 0}
							class="w-full px-4 py-2 {ADMIN_CONFIG.resetAll.buttonClass} text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
						>
							<span>{ADMIN_CONFIG.resetAll.icon}</span>
							<span>{ADMIN_CONFIG.resetAll.buttonText}</span>
						</button>
					{:else}
						<div class="space-y-3">
							<div class="{ADMIN_CONFIG.resetAll.confirmClass} rounded-lg p-3">
								<p class="text-sm {ADMIN_CONFIG.resetAll.confirmTextClass}">
									🚨 {formatMessage(ADMIN_CONFIG.resetAll.confirmMessage, 0, counts.users, counts.equipment)}
								</p>
							</div>
							<div class="flex space-x-2">
								<button
									onclick={deleteAllData}
									class="flex-1 px-3 py-2 {ADMIN_CONFIG.resetAll.buttonClass} text-white rounded-md transition-colors text-sm font-bold"
								>
									💥 TAK, USUŃ WSZYSTKO
								</button>
								<button
									onclick={() => confirmStates.all = false}
									class="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
								>
									❌ Anuluj
								</button>
							</div>
						</div>
					{/if}
				</div>
				
				{#if messages.general}
					{@const style = getMessageStyle(messages.general)}
					<div class="mt-4 p-3 rounded-md {style.bg}">
						<p class="text-sm {style.text}">
							{messages.general}
						</p>
					</div>
				{/if}
			</div>
		</div>


		
		<!-- Safety Info -->
		<div class="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-yellow-800 mb-3">🛡️ Informacje bezpieczeństwa</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
				<div>
					<h4 class="font-medium mb-2">🔄 Przed wykonaniem operacji:</h4>
					<ul class="space-y-1">
						<li>• Wykonaj kopię zapasową danych</li>
						<li>• Upewnij się, że masz odpowiednie uprawnienia</li>
						<li>• Powiadom użytkowników o planowanej operacji</li>
					</ul>
				</div>
				<div>
					<h4 class="font-medium mb-2">⚠️ Skutki operacji:</h4>
					<ul class="space-y-1">
						<li>• Dane zostaną trwale usunięte</li>
						<li>• Nie ma możliwości cofnięcia operacji</li>
						<li>• System będzie wymagał ponownej konfiguracji</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
