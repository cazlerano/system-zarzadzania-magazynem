<script>
	import { assignEquipment, unassignEquipment, getAvailableEquipment, equipmentTypes } from '$lib/data.js';
	
	/** @typedef {Object} Equipment @property {number} id @property {string} name @property {string} type @property {string} serialNumber @property {string} clnNumber @property {string} inventoryNumber @property {boolean} [damaged] */
	/** @typedef {Object} User @property {number} id @property {string} name @property {string} email @property {Equipment[]} equipment */
	/** @typedef {Object} EquipmentManagementModalProps @property {boolean} isOpen @property {User} selectedUser @property {Function} onUpdate */
	
	/** @type {EquipmentManagementModalProps} */
	let { isOpen = $bindable(), selectedUser, onUpdate } = $props();
	
	// Konfiguracja modala
	const MODAL_CONFIG = {
		TITLES: {
			ASSIGN: '➕ Przypisz Sprzęt',
			UNASSIGN: '➖ Usuń Przypisanie'
		},
		LABELS: {
			USER_INFO: 'Użytkownik:',
			CATEGORY_SELECT: 'Wybierz kategorię sprzętu:',
			EQUIPMENT_SELECT: 'Wybierz sprzęt z kategorii',
			NOTE_ASSIGN: 'Notatka (opcjonalna):',
			NOTE_UNASSIGN: 'Notatka (opcjonalna):',
			ASSIGN_TAB: '➕ Przypisz sprzęt',
			UNASSIGN_TAB: '➖ Usuń przypisanie',
			ASSIGN_BUTTON: 'Przypisz',
			CANCEL_BUTTON: 'Anuluj',
			UNASSIGN_BUTTON: 'Odbierz',
			UNASSIGN_ALL_BUTTON: 'Odpnij wszystkie urządzenia',
			CLOSE_MODAL: 'Zamknij modal'
		},
		PLACEHOLDERS: {
			CATEGORY: '-- Wybierz kategorię --',
			EQUIPMENT: '-- Wybierz sprzęt --',
			NOTE_ASSIGN: 'Powód przypisania...',
			NOTE_UNASSIGN: 'Powód odebrania...'
		},
		MESSAGES: {
			LOADING: 'Ładowanie dostępnego sprzętu...',
			NO_EQUIPMENT: 'Brak dostępnego sprzętu w magazynie',
			NO_EQUIPMENT_CATEGORY: 'Brak dostępnego sprzętu w wybranej kategorii',
			NO_ASSIGNED_EQUIPMENT: 'Użytkownik nie ma przypisanego sprzętu',
			UNASSIGN_INSTRUCTION: 'Wybierz sprzęt do odebrania od użytkownika:'
		},
		EQUIPMENT_EMOJIS: {
			'Komputer': '💻',
			'Drukarka': '🖨️',
			'Monitor': '🖥️',
			'Myszka': '🖱️',
			'Zasilacz': '🔌',
			'Stacja dokująca': '🔗'
		},
		STYLES: {
			MODAL_BASE: 'fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50',
			MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden',
			HEADER: 'bg-green-600 px-6 py-4 flex items-center justify-between',
			TAB_CONTAINER: 'flex mb-6 bg-gray-100 rounded-lg p-1',
			TAB_BUTTON: 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
			TAB_ACTIVE: 'bg-green-600 text-white',
			TAB_INACTIVE: 'text-gray-600',
			FORM_GROUP: 'space-y-4',
			SELECT: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			TEXTAREA: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			EQUIPMENT_ITEM: 'flex items-center justify-between p-3 border border-gray-200 rounded-lg',
			BUTTON_PRIMARY: 'px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
			BUTTON_SECONDARY: 'px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors',
			BUTTON_DANGER: 'px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors relative z-10 cursor-pointer min-w-[80px] border-2 border-red-700 hover:border-red-800',
			BUTTON_DANGER_FULL: 'w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150 flex items-center justify-center space-x-2',
			LOADING_SKELETON: 'animate-pulse h-10 bg-gray-200 rounded w-full',
			EMPTY_STATE: 'text-center py-8'
		}
	};
	
	// Stan
	/** @type {Equipment[]} */
	let availableEquipment = $state([]);
	/** @type {Equipment[]} */
	let filteredEquipment = $state([]);
	let selectedEquipmentId = $state('');
	let selectedCategory = $state('');
	let note = $state('');
	let isUnassignMode = $state(false); // Prosta wartość logiczna zamiast trybu jako string
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
	 * Sformatuj tekst wyświetlania sprzętu
	 * @param {Equipment} item
	 * @returns {string}
	 */
	function formatEquipmentDisplay(item) {
		let display = `${item.name} (S/N: ${item.serialNumber})`;
		if (item.type === 'Komputer' && item.clnNumber) {
			display += ` • CLN: ${item.clnNumber}`;
		}
		return display;
	}
	
	/**
	 * Zresetuj stan formularza
	 */
	function resetForm() {
		selectedEquipmentId = '';
		selectedCategory = '';
		note = '';
		isUnassignMode = false; // Zawsze resetuj do trybu przypisania
	}
	
	/**
	 * Zamknij modal i zresetuj stan
	 */
	function closeModal() {
		isOpen = false;
		resetForm();
	}
	
	/**
	 * Odśwież dane dostępnego sprzętu
	 */
	async function refreshAvailableEquipment() {
		try {
			isLoading = true;
			availableEquipment = await getAvailableEquipment();
		} catch (error) {
			console.error('Error loading available equipment:', error);
			availableEquipment = [];
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
	
	/**
	 * Przełącz na tryb przypisania
	 */
	function switchToAssign() {
		isUnassignMode = false;
		note = '';
	}
	
	/**
	 * Przełącz na tryb odebrania
	 */
	function switchToUnassign() {
		isUnassignMode = true;
		note = '';
	}

	// Efekty
	
	// Załaduj sprzęt, gdy modal się otwiera
	$effect(() => {
		if (isOpen) {
			refreshAvailableEquipment();
		}
	});

	// Filtruj sprzęt według kategorii
	$effect(() => {
		if (selectedCategory) {
			filteredEquipment = availableEquipment.filter(item => item.type === selectedCategory);
		} else {
			filteredEquipment = [];
		}
		// Zresetuj wybrany sprzęt, gdy zmienia się kategoria
		selectedEquipmentId = '';
	});
	
	/**
	 * Obsłuż przypisanie sprzętu
	 */
	async function handleAssign() {
		if (!selectedEquipmentId || !selectedUser) return;
		
		try {
			const success = await assignEquipment(parseInt(selectedEquipmentId), selectedUser.id, note);
			if (success) {
				onUpdate();
				closeModal();
			}
		} catch (error) {
			console.error('Error assigning equipment:', error);
		}
	}
	
	/**
	 * Obsłuż odebranie pojedynczego sprzętu
	 * @param {number} equipmentId
	 */
	async function handleUnassign(equipmentId) {
		try {
			const success = await unassignEquipment(equipmentId, note);
			if (success) {
				onUpdate();
				closeModal();
			}
		} catch (error) {
			console.error('Error unassigning equipment:', error);
		}
	}

	/**
	 * Obsłuż odebranie całego sprzętu od użytkownika
	 */
	async function handleUnassignAll() {
		if (!selectedUser.equipment || selectedUser.equipment.length === 0) return;
		
		try {
			let successCount = 0;
			for (const item of selectedUser.equipment) {
				const success = await unassignEquipment(item.id, note);
				if (success) {
					successCount++;
				}
			}
			
			if (successCount > 0) {
				onUpdate();
				closeModal();
			}
		} catch (error) {
			console.error('Error unassigning all equipment:', error);
		}
	}
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
					{isUnassignMode ? MODAL_CONFIG.TITLES.UNASSIGN : MODAL_CONFIG.TITLES.ASSIGN}
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
			<div class="p-6">
				{#if selectedUser}
					<div class="mb-4">
						<p class="text-sm text-gray-600">
							<strong>{MODAL_CONFIG.LABELS.USER_INFO}</strong> {selectedUser.name} ({selectedUser.email})
						</p>
					</div>
					
					<!-- Tab navigation -->
					<div class={MODAL_CONFIG.STYLES.TAB_CONTAINER}>
						<button
							type="button"
							class="{MODAL_CONFIG.STYLES.TAB_BUTTON} {!isUnassignMode ? MODAL_CONFIG.STYLES.TAB_ACTIVE : MODAL_CONFIG.STYLES.TAB_INACTIVE}"
							onclick={switchToAssign}
						>
							{MODAL_CONFIG.LABELS.ASSIGN_TAB}
						</button>
						<button
							type="button"
							class="{MODAL_CONFIG.STYLES.TAB_BUTTON} {isUnassignMode ? MODAL_CONFIG.STYLES.TAB_ACTIVE : MODAL_CONFIG.STYLES.TAB_INACTIVE}"
							onclick={switchToUnassign}
						>
							{MODAL_CONFIG.LABELS.UNASSIGN_TAB}
						</button>
					</div>
					
					{#if !isUnassignMode}
						<!-- Assign equipment -->
						<div class={MODAL_CONFIG.STYLES.FORM_GROUP}>
							<div>
								<label for="category-select" class="block text-sm font-medium text-gray-700 mb-2">
									{MODAL_CONFIG.LABELS.CATEGORY_SELECT}
								</label>
								{#if isLoading}
									<div class="animate-pulse">
										<div class={MODAL_CONFIG.STYLES.LOADING_SKELETON}></div>
									</div>
									<p class="text-sm text-gray-500 mt-1">{MODAL_CONFIG.MESSAGES.LOADING}</p>
								{:else}
									<select
										id="category-select"
										bind:value={selectedCategory}
										class={MODAL_CONFIG.STYLES.SELECT}
									>
										<option value="">{MODAL_CONFIG.PLACEHOLDERS.CATEGORY}</option>
										{#each Object.values(equipmentTypes) as category}
											{#if availableEquipment.some(item => item.type === category)}
												<option value={category}>{category}</option>
											{/if}
										{/each}
									</select>
									{#if availableEquipment.length === 0}
										<p class="text-sm text-gray-500 mt-1">{MODAL_CONFIG.MESSAGES.NO_EQUIPMENT}</p>
									{/if}
								{/if}
							</div>

							{#if selectedCategory}
								<div>
									<label for="equipment-select" class="block text-sm font-medium text-gray-700 mb-2">
										{MODAL_CONFIG.LABELS.EQUIPMENT_SELECT} "{selectedCategory}":
									</label>
									<select
										id="equipment-select"
										bind:value={selectedEquipmentId}
										class={MODAL_CONFIG.STYLES.SELECT}
									>
										<option value="">{MODAL_CONFIG.PLACEHOLDERS.EQUIPMENT}</option>
										{#each filteredEquipment as item}
											<option value={item.id}>
												{formatEquipmentDisplay(item)}
											</option>
										{/each}
									</select>
									{#if filteredEquipment.length === 0}
										<p class="text-sm text-gray-500 mt-1">{MODAL_CONFIG.MESSAGES.NO_EQUIPMENT_CATEGORY}</p>
									{/if}
								</div>
							{/if}
							
							<div>
								<label for="assign-note" class="block text-sm font-medium text-gray-700 mb-2">
									{MODAL_CONFIG.LABELS.NOTE_ASSIGN}
								</label>
								<textarea
									id="assign-note"
									bind:value={note}
									placeholder={MODAL_CONFIG.PLACEHOLDERS.NOTE_ASSIGN}
									class={MODAL_CONFIG.STYLES.TEXTAREA}
									rows="2"
								></textarea>
							</div>
						</div>
					{:else}
						<!-- Unassign equipment -->
						<div>
							<p class="text-sm text-gray-600 mb-4">
								{MODAL_CONFIG.MESSAGES.UNASSIGN_INSTRUCTION}
							</p>
							
							{#if selectedUser.equipment && selectedUser.equipment.length > 0}
								<div class="space-y-2 mb-4">
									{#each selectedUser.equipment as item}
										<div class={MODAL_CONFIG.STYLES.EQUIPMENT_ITEM}>
											<div class="flex items-center space-x-3">
												<span class="text-lg">
													{getEquipmentEmoji(item.type)}
												</span>
												<div>
													<p class="font-medium text-gray-900">{item.name}</p>
													<p class="text-sm text-gray-500">{item.type} • S/N: {item.serialNumber}</p>
												</div>
											</div>
											<button
												type="button"
												onclick={() => handleUnassign(item.id)}
												class={MODAL_CONFIG.STYLES.BUTTON_DANGER}
											>
												{MODAL_CONFIG.LABELS.UNASSIGN_BUTTON}
											</button>
										</div>
									{/each}
								</div>
								
								<div>
									<label for="unassign-note" class="block text-sm font-medium text-gray-700 mb-2">
										{MODAL_CONFIG.LABELS.NOTE_UNASSIGN}
									</label>
									<textarea
										id="unassign-note"
										bind:value={note}
										placeholder={MODAL_CONFIG.PLACEHOLDERS.NOTE_UNASSIGN}
										class={MODAL_CONFIG.STYLES.TEXTAREA}
										rows="2"
									></textarea>
								</div>

								<!-- Unassign all equipment button -->
								<div class="border-t pt-4">
									<button
										type="button"
										onclick={handleUnassignAll}
										class={MODAL_CONFIG.STYLES.BUTTON_DANGER_FULL}
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
										</svg>
										<span>{MODAL_CONFIG.LABELS.UNASSIGN_ALL_BUTTON}</span>
									</button>
								</div>
							{:else}
								<div class={MODAL_CONFIG.STYLES.EMPTY_STATE}>
									<div class="text-gray-400 text-4xl mb-2">📭</div>
									<p class="text-gray-600">{MODAL_CONFIG.MESSAGES.NO_ASSIGNED_EQUIPMENT}</p>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
			
			<!-- Modal footer -->
			<div class="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
				<button
					type="button"
					onclick={closeModal}
					class={MODAL_CONFIG.STYLES.BUTTON_SECONDARY}
				>
					{MODAL_CONFIG.LABELS.CANCEL_BUTTON}
				</button>
				{#if !isUnassignMode}
					<button
						type="button"
						onclick={handleAssign}
						disabled={!selectedEquipmentId}
						class={MODAL_CONFIG.STYLES.BUTTON_PRIMARY}
					>
						{MODAL_CONFIG.LABELS.ASSIGN_BUTTON}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
