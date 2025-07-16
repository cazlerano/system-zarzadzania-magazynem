<script>
	import { getEquipmentHistory, formatDate } from '$lib/data.js';
	
	/** @typedef {{id: number, name: string, type: string, serialNumber: string, clnNumber?: string, inventoryNumber?: string, roomLocation?: string, assignedUser?: {name: string, email: string}, lastModified?: string, damaged?: boolean}} Equipment */
	/** @typedef {Object} User @property {number} id @property {string} name @property {string} email */
	/** @typedef {Object} HistoryEvent @property {string} action @property {string} date @property {string} note @property {User|null} user */
	/** @typedef {Object} EquipmentHistoryModalProps @property {boolean} isOpen @property {Equipment|null} equipment */
	/** @typedef {Object} AssignmentStatus @property {string} text @property {string} style */
	/** @typedef {Object} ActionIcon @property {string} icon @property {string} color */
	
	/** @type {EquipmentHistoryModalProps} */
	let { isOpen = $bindable(), equipment } = $props();
	
	// Konfiguracja modala
	const MODAL_CONFIG = {
		TITLE: '📋 Historia Sprzętu',
		LABELS: {
			EQUIPMENT_INFO: 'Informacje o sprzęcie',
			HISTORY_TIMELINE: 'Historia przypisań',
			CURRENTLY_ASSIGNED: 'Obecnie przypisane do:',
			STATUS: 'Status:',
			CLOSE_BUTTON: 'Zamknij',
			CLOSE_MODAL: 'Zamknij modal'
		},
		MESSAGES: {
			LOADING: 'Ładowanie historii...',
			NO_HISTORY: 'Brak historii dla tego sprzętu',
			STATUS_WAREHOUSE: 'Magazyn IT'
		},
		ACTIONS: {
			assigned: 'Przypisano',
			unassigned: 'Oddano do magazynu',
			added: 'Dodano do magazynu',
			damaged: 'Oznaczono jako uszkodzone',
			repaired: 'Naprawiono'
		},
		EQUIPMENT_EMOJIS: {
			'Komputer': '💻',
			'Drukarka': '🖨️',
			'Monitor': '🖥️',
			'Myszka': '🖱️',
			'Zasilacz': '🔌',
			'Stacja dokująca': '🔗'
		},
		ACTION_ICONS: {
			assigned: { icon: '✓', color: 'bg-green-500' },
			unassigned: { icon: '↵', color: 'bg-orange-500' },
			added: { icon: '+', color: 'bg-blue-500' },
			damaged: { icon: '⚠️', color: 'bg-red-500' },
			repaired: { icon: '🔧', color: 'bg-green-600' }
		},
		STYLES: {
			MODAL_BASE: 'fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50',
			MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden',
			HEADER: 'bg-green-600 px-6 py-4 flex items-center justify-between',
			CONTENT: 'p-6 overflow-y-auto max-h-[calc(80vh-80px)]',
			EQUIPMENT_INFO: 'bg-green-50 rounded-lg p-4 mb-6',
			TIMELINE_CONTAINER: 'space-y-4',
			TIMELINE_ITEM: 'flex items-start space-x-4',
			ACTION_ICON: 'w-8 h-8 rounded-full flex items-center justify-center',
			LOADING_CONTAINER: 'flex justify-center py-8',
			LOADING_SPINNER: 'animate-spin rounded-full h-8 w-8 border-b-2 border-green-500',
			EMPTY_STATE: 'text-center py-8',
			FOOTER: 'bg-gray-50 px-6 py-4 flex justify-end',
			BUTTON_PRIMARY: 'px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors'
		}
	};
	
	// Stan
	/** @type {HistoryEvent[]} */
	let history = $state([]);
	let isLoading = $state(false);
	
	// Funkcje pomocnicze
	
	/**
	 * Pobierz emoji sprzętu na podstawie typu
	 * @param {string} type
	 * @returns {string}
	 */
	function getEquipmentEmoji(type) {
		return MODAL_CONFIG.EQUIPMENT_EMOJIS[/** @type {keyof typeof MODAL_CONFIG.EQUIPMENT_EMOJIS} */ (type)] || '📦';
	}
	
	/**
	 * Pobierz tekst akcji do wyświetlenia
	 * @param {string} action
	 * @returns {string}
	 */
	function getActionText(action) {
		return MODAL_CONFIG.ACTIONS[/** @type {keyof typeof MODAL_CONFIG.ACTIONS} */ (action)] || action;
	}
	
	/**
	 * Pobierz konfigurację ikony akcji
	 * @param {string} action
	 * @returns {ActionIcon}
	 */
	function getActionIcon(action) {
		return MODAL_CONFIG.ACTION_ICONS[/** @type {keyof typeof MODAL_CONFIG.ACTION_ICONS} */ (action)] || 
			{ icon: '•', color: 'bg-gray-500' };
	}
	
	/**
	 * Sformatuj szczegóły sprzętu
	 * @param {Equipment|null} equipment
	 * @returns {string}
	 */
	function formatEquipmentDetails(equipment) {
		if (!equipment) return '';
		
		let details = `${equipment.type} • S/N: ${equipment.serialNumber}`;
		
		if (equipment.inventoryNumber) {
			details += ` • INV: ${equipment.inventoryNumber}`;
		}
		
		if (equipment.type === 'Komputer' && equipment.clnNumber) {
			details += ` • CLN: ${equipment.clnNumber}`;
		}
		
		if (equipment.damaged) {
			details += ` • ⚠️ USZKODZONY`;
		}
		
		return details;
	}
	
	/**
	 * Pobierz aktualny status przypisania
	 * @param {Equipment} equipment
	 * @returns {AssignmentStatus}
	 */
	function getCurrentAssignmentStatus(equipment) {
		if (!equipment) {
			return {
				text: MODAL_CONFIG.MESSAGES.STATUS_WAREHOUSE,
				style: 'text-gray-600'
			};
		}
		
		if (equipment.assignedUser) {
			return {
				text: `${equipment.assignedUser.name} (${equipment.assignedUser.email})`,
				style: 'text-green-700'
			};
		}
		
		if ((equipment.type === 'Monitor' || equipment.type === 'Drukarka') && equipment.roomLocation) {
			return {
				text: `📍 ${equipment.roomLocation}`,
				style: 'text-purple-700'
			};
		}
		
		return {
			text: MODAL_CONFIG.MESSAGES.STATUS_WAREHOUSE,
			style: 'text-gray-600'
		};
	}
	
	/**
	 * Zamknij modal
	 */
	function closeModal() {
		isLoading = false;
		isOpen = false;
	}
	
	/**
	 * Załaduj historię sprzętu
	 */
	async function loadHistory() {
		if (!equipment) return;
		
		try {
			isLoading = true;
			history = await getEquipmentHistory(equipment.id);
		} catch (error) {
			console.error('Error loading equipment history:', error);
			history = [];
		} finally {
			isLoading = false;
		}
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

	// Efekty
	
	// Załaduj historię, gdy zmienia się sprzęt i modal jest otwarty
	$effect(() => {
		if (equipment && isOpen) {
			loadHistory();
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
					onclick={closeModal}
					class="text-green-100 hover:text-white transition-colors"
					aria-label={MODAL_CONFIG.LABELS.CLOSE_MODAL}
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			<!-- Modal content -->
			<div class={MODAL_CONFIG.STYLES.CONTENT}>
				{#if equipment}
					<!-- Equipment info -->
					<div class={MODAL_CONFIG.STYLES.EQUIPMENT_INFO}>
						<div class="flex items-center mb-2">
							<span class="text-2xl mr-3">
								{getEquipmentEmoji(equipment.type)}
							</span>
							<div>
								<h3 class="text-lg font-semibold text-green-900">{equipment.name}</h3>
								<p class="text-green-600">
									{formatEquipmentDetails(equipment)}
								</p>
							</div>
						</div>
						{#if equipment}
							{@const assignmentStatus = getCurrentAssignmentStatus(equipment)}
							<div class="text-sm {assignmentStatus.style} mb-2">
								<strong>{MODAL_CONFIG.LABELS.CURRENTLY_ASSIGNED}</strong> {assignmentStatus.text}
							</div>
							{#if equipment.damaged}
								<div class="text-sm text-red-700">
									<strong>Status:</strong> 
									<span class="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
										⚠️ Uszkodzone
									</span>
								</div>
							{:else}
								<div class="text-sm text-green-700">
									<strong>Status:</strong> 
									<span class="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										✅ Sprawne
									</span>
								</div>
							{/if}
						{/if}
					</div>
					
					<!-- History timeline -->
					<div>
						<h4 class="text-lg font-semibold text-gray-900 mb-4">{MODAL_CONFIG.LABELS.HISTORY_TIMELINE}</h4>
						{#if isLoading}
							<div class={MODAL_CONFIG.STYLES.LOADING_CONTAINER}>
								<div class={MODAL_CONFIG.STYLES.LOADING_SPINNER}></div>
								<span class="ml-3 text-green-600">{MODAL_CONFIG.MESSAGES.LOADING}</span>
							</div>
						{:else if history.length > 0}
							<div class={MODAL_CONFIG.STYLES.TIMELINE_CONTAINER}>
								{#each history as event}
									{@const actionIcon = getActionIcon(event.action)}
									<div class={MODAL_CONFIG.STYLES.TIMELINE_ITEM}>
										<div class="flex-shrink-0">
											<div class="{actionIcon.color} {MODAL_CONFIG.STYLES.ACTION_ICON}">
												<span class="text-white text-sm">{actionIcon.icon}</span>
											</div>
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center justify-between">
												<p class="text-sm font-medium text-gray-900">
													{getActionText(event.action)}
													{#if event.user}
														- {event.user.name}
													{/if}
												</p>
												<p class="text-sm text-gray-500">
													{formatDate(event.date)}
												</p>
											</div>
											{#if event.user}
												<p class="text-sm text-gray-600">
													{event.user.email}
												</p>
											{/if}
											{#if event.note}
												<p class="text-sm text-gray-700 mt-1">
													{event.note}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class={MODAL_CONFIG.STYLES.EMPTY_STATE}>
								<div class="text-gray-400 text-4xl mb-2">📝</div>
								<p class="text-gray-600">{MODAL_CONFIG.MESSAGES.NO_HISTORY}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			
			<!-- Modal footer -->
			<div class={MODAL_CONFIG.STYLES.FOOTER}>
				<button
					onclick={closeModal}
					class={MODAL_CONFIG.STYLES.BUTTON_PRIMARY}
				>
					{MODAL_CONFIG.LABELS.CLOSE_BUTTON}
				</button>
			</div>
		</div>
	</div>
{/if}
