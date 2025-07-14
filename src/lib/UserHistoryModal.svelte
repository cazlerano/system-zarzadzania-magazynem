<script>
	import { getUserHistory, formatDate } from '$lib/data.js';
	
	/** @typedef {Object} User @property {number} id @property {string} name @property {string} email */
	/** @typedef {Object} UserHistoryModalProps @property {boolean} isOpen @property {User} selectedUser */
	
	/** @type {UserHistoryModalProps} */
	let { isOpen = $bindable(), selectedUser } = $props();
	
	// Konfiguracja modala
	const MODAL_CONFIG = {
		TITLE: '📋 Historia Użytkownika',
		LABELS: {
			CLOSE_MODAL: 'Zamknij modal',
			NO_HISTORY: 'Brak historii dla tego użytkownika',
			LOADING: 'Ładowanie historii...'
		},
		ACTION_LABELS: {
			'assigned': 'Przypisano',
			'unassigned': 'Odebrano', 
			'added': 'Dodano do magazynu',
			'removed': 'Usunięto z magazynu',
			'damaged': 'Oznaczono jako uszkodzony',
			'repaired': 'Naprawiono'
		},
		ACTION_ICONS: {
			'assigned': '➕',
			'unassigned': '➖',
			'added': '📦',
			'removed': '🗑️',
			'damaged': '⚠️',
			'repaired': '🔧'
		},
		ACTION_COLORS: {
			'assigned': 'text-green-600 bg-green-50',
			'unassigned': 'text-red-600 bg-red-50',
			'added': 'text-blue-600 bg-blue-50',
			'removed': 'text-gray-600 bg-gray-50',
			'damaged': 'text-orange-600 bg-orange-50',
			'repaired': 'text-green-600 bg-green-50'
		},
		STYLES: {
			MODAL_BASE: 'fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50',
			MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden',
			HEADER: 'bg-blue-600 px-6 py-4 flex items-center justify-between',
			CONTENT: 'p-6 max-h-[70vh] overflow-y-auto',
			HISTORY_ITEM: 'flex items-start space-x-4 p-4 border border-gray-200 rounded-lg',
			EQUIPMENT_INFO: 'flex items-center space-x-2',
			DATE_TEXT: 'text-sm text-gray-500',
			ACTION_BADGE: 'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
			NOTE_TEXT: 'text-sm text-gray-600 mt-1 italic',
			LOADING_SKELETON: 'animate-pulse h-16 bg-gray-200 rounded w-full',
			EMPTY_STATE: 'text-center py-12'
		}
	};
	
	// Stan
	/** @type {any[]} */
	let userHistory = $state([]);
	let isLoading = $state(false);
	
	// Mapowanie emoji sprzętu
	const EQUIPMENT_EMOJIS = {
		'Komputer': '💻',
		'Drukarka': '🖨️',
		'Monitor': '🖥️',
		'Myszka': '🖱️',
		'Zasilacz': '🔌',
		'Stacja dokująca': '🔗',
		'YubiKey': '🔐'
	};
	
	/**
	 * Pobierz emoji sprzętu na podstawie typu
	 * @param {string} type
	 * @returns {string}
	 */
	function getEquipmentEmoji(type) {
		return EQUIPMENT_EMOJIS[/** @type {keyof typeof EQUIPMENT_EMOJIS} */ (type)] || '📦';
	}
	
	/**
	 * Zamknij modal i zresetuj stan
	 */
	function closeModal() {
		isOpen = false;
		userHistory = [];
	}
	
	/**
	 * Obsłuż kliknięcie w tło modala
	 * @param {MouseEvent} event
	 */
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}
	
	/**
	 * Obsłuż zdarzenia klawiatury
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
	
	/**
	 * Załaduj historię użytkownika, gdy modal się otwiera
	 */
	async function loadUserHistory() {
		if (!selectedUser || !isOpen) return;
		
		try {
			isLoading = true;
			userHistory = await getUserHistory(selectedUser.id);
		} catch (error) {
			console.error('Error loading user history:', error);
			userHistory = [];
		} finally {
			isLoading = false;
		}
	}
	
	/**
	 * Pobierz etykietę akcji z domyślną wartością
	 * @param {string} action
	 * @returns {string}
	 */
	function getActionLabel(action) {
		return MODAL_CONFIG.ACTION_LABELS[/** @type {keyof typeof MODAL_CONFIG.ACTION_LABELS} */ (action)] || action;
	}
	
	/**
	 * Pobierz ikonę akcji z domyślną wartością
	 * @param {string} action
	 * @returns {string}
	 */
	function getActionIcon(action) {
		return MODAL_CONFIG.ACTION_ICONS[/** @type {keyof typeof MODAL_CONFIG.ACTION_ICONS} */ (action)] || '📝';
	}
	
	/**
	 * Pobierz kolor akcji z domyślną wartością
	 * @param {string} action
	 * @returns {string}
	 */
	function getActionColor(action) {
		return MODAL_CONFIG.ACTION_COLORS[/** @type {keyof typeof MODAL_CONFIG.ACTION_COLORS} */ (action)] || 'text-gray-600 bg-gray-50';
	}
	
	// Efekty
	
	// Załaduj historię, gdy modal się otwiera lub zmienia się użytkownik
	$effect(() => {
		if (isOpen && selectedUser) {
			loadUserHistory();
		}
	});
</script>

<!-- Modal backdrop -->
{#if isOpen}
	<div 
		class={MODAL_CONFIG.STYLES.MODAL_BASE}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div class={MODAL_CONFIG.STYLES.MODAL_CONTENT}>
			<!-- Modal header -->
			<div class={MODAL_CONFIG.STYLES.HEADER}>
				<h2 id="modal-title" class="text-xl font-bold text-white">
					{MODAL_CONFIG.TITLE}
				</h2>
				<button
					type="button"
					onclick={closeModal}
					class="text-blue-100 hover:text-white transition-colors"
					aria-label={MODAL_CONFIG.LABELS.CLOSE_MODAL}
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			<!-- Modal content -->
			<div class={MODAL_CONFIG.STYLES.CONTENT}>
				{#if selectedUser}
					<div class="mb-6">
						<h3 class="text-lg font-medium text-gray-900">
							Historia użytkownika: <span class="text-blue-600">{selectedUser.name}</span>
						</h3>
						<p class="text-gray-600">{selectedUser.email}</p>
					</div>
					
					{#if isLoading}
						<div class="space-y-4">
							{#each {length: 3} as _}
								<div class={MODAL_CONFIG.STYLES.LOADING_SKELETON}></div>
							{/each}
						</div>
						<p class="text-center text-gray-500 mt-4">{MODAL_CONFIG.LABELS.LOADING}</p>
					{:else if userHistory.length > 0}
						<div class="space-y-4">
							{#each userHistory as event}
								<div class={MODAL_CONFIG.STYLES.HISTORY_ITEM}>
									<div class="flex-shrink-0">
										<span class="text-2xl">
											{getEquipmentEmoji(event.equipment?.type || '')}
										</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between">
											<div class={MODAL_CONFIG.STYLES.EQUIPMENT_INFO}>
												<h4 class="font-medium text-gray-900">
													{event.equipment?.name || 'Nieznany sprzęt'}
												</h4>
												<span class="text-gray-500">•</span>
												<span class="text-sm text-gray-600">
													{event.equipment?.type || 'Nieznany typ'}
												</span>
											</div>
											<div class="flex items-center space-x-2">
												<span class="{MODAL_CONFIG.STYLES.ACTION_BADGE} {getActionColor(event.action)}">
													<span>{getActionIcon(event.action)}</span>
													<span>{getActionLabel(event.action)}</span>
												</span>
											</div>
										</div>
										<div class="mt-1">
											<p class={MODAL_CONFIG.STYLES.DATE_TEXT}>
												{formatDate(event.date)}
											</p>
											{#if event.note && event.note.trim()}
												<p class={MODAL_CONFIG.STYLES.NOTE_TEXT}>
													"{event.note}"
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class={MODAL_CONFIG.STYLES.EMPTY_STATE}>
							<div class="text-gray-400 text-6xl mb-4">📭</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">
								{MODAL_CONFIG.LABELS.NO_HISTORY}
							</h3>
							<p class="text-gray-600">
								Ten użytkownik nie ma jeszcze żadnej historii przypisań sprzętu.
							</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
