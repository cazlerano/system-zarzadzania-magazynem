<script>
	import { addEquipment, deleteEquipment, generateNextClnNumber, updateEquipmentDamageStatus } from '$lib/data.js';
	
	/** @typedef {{id: number, name: string, type: string, serialNumber: string, clnNumber?: string, inventoryNumber?: string, roomLocation?: string, assignedUser?: {name: string, email: string}, lastModified?: string, damaged?: boolean}} Equipment */
	/** @typedef {{name: string, type: string, serialNumber: string, clnNumber: string, inventoryNumber: string, roomLocation: string, damaged: boolean}} EquipmentFormData */
	/** @typedef {{isOpen: boolean, equipment: Equipment|null, onUpdate: Function}} EquipmentEditModalProps */
	
	/** @type {EquipmentEditModalProps} */
	let { isOpen = $bindable(), equipment, onUpdate } = $props();
	
	// Modal configuration
	const MODAL_CONFIG = {
		TITLE: '✏️ Edytuj Sprzęt',
		LABELS: {
			NAME: 'Nazwa sprzętu:',
			TYPE: 'Typ sprzętu:',
			SERIAL_NUMBER: 'Numer seryjny:',
			INVENTORY_NUMBER: 'Numer inwentarzowy',
			ROOM_LOCATION: 'Lokalizacja/Pokój',
			CLN_NUMBER: 'Numer CLN',
			DAMAGED: 'Sprzęt uszkodzony',
			OPTIONAL: '(opcjonalny)',
			SAVE: '💾 Zapisz zmiany',
			DELETE: '🗑️ Usuń sprzęt',
			CANCEL: 'Anuluj',
			CLOSE_MODAL: 'Zamknij modal'
		},
		PLACEHOLDERS: {
			NAME: 'Dell Latitude 5520',
			TYPE: '-- Wybierz typ --',
			SERIAL_NUMBER: 'DL123456789',
			INVENTORY_NUMBER: 'INV001',
			ROOM_LOCATION: 'Pokój 101, Sala konferencyjna A, Recepcja...',
			CLN_NUMBER: 'CLN000000'
		},
		MESSAGES: {
			SUCCESS_UPDATE: '✅ Sprzęt został zaktualizowany pomyślnie',
			SUCCESS_DELETE: '✅ Sprzęt został usunięty pomyślnie',
			ERROR_REQUIRED_FIELDS: '❌ Wszystkie podstawowe pola są wymagane',
			ERROR_UPDATE_GENERIC: '❌ Błąd podczas aktualizacji sprzętu',
			ERROR_DELETE_GENERIC: '❌ Błąd podczas usuwania sprzętu',
			ERROR_ASSIGNED_EQUIPMENT: '❌ Nie można usunąć sprzętu, który jest przypisany do użytkownika',
			WARNING_CANT_DELETE: 'Nie można usunąć tego sprzętu - jest przypisany do użytkownika. Aby usunąć sprzęt, najpierw odepnij go od użytkownika.',
			DELETE_CONFIRMATION: 'Czy na pewno chcesz usunąć sprzęt:',
			DELETE_WARNING: '⚠️ Ta operacja jest nieodwracalna!',
			LOADING_SAVE: 'Zapisywanie...',
			LOADING_DELETE: 'Usuwanie...'
		},
		EQUIPMENT_TYPES: [
			'Komputer',
			'Monitor', 
			'Drukarka',
			'Myszka',
			'Klawiatura',
			'Zasilacz',
			'Stacja dokująca',
			'YubiKey'
		],
		EQUIPMENT_EMOJIS: {
			'Komputer': '💻',
			'Monitor': '🖥️',
			'Drukarka': '🖨️',
			'Myszka': '🖱️',
			'Klawiatura': '⌨️',
			'Zasilacz': '🔌',
			'Stacja dokująca': '🔗',
			'YubiKey': '🔐'
		},
		STYLES: {
			MODAL_BASE: 'fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50',
			MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden',
			HEADER: 'bg-green-600 px-6 py-4 flex items-center justify-between',
			CONTENT: 'p-6',
			FOOTER: 'bg-gray-50 px-6 py-4',
			FORM_GROUP: 'space-y-4',
			INPUT: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			SELECT: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			SUCCESS_MESSAGE: 'mt-4 p-3 rounded-md bg-green-50',
			ERROR_MESSAGE: 'mt-4 p-3 rounded-md bg-red-50',
			WARNING_BOX: 'mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md',
			BUTTON_PRIMARY: 'px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
			BUTTON_DANGER: 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
			BUTTON_SECONDARY: 'px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
			DELETE_MODAL_BASE: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
			DELETE_MODAL_CONTENT: 'bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl',
			DELETE_EQUIPMENT_INFO: 'bg-gray-50 p-3 rounded-md border'
		},
		AUTO_CLOSE_DELAY: 800
	};
	
	// State
	/** @type {EquipmentFormData} */
	let formData = $state({
		name: '',
		type: '',
		serialNumber: '',
		clnNumber: '',
		inventoryNumber: '',
		roomLocation: '',
		damaged: false
	});
	
	let isLoading = $state(false);
	let message = $state('');
	let showDeleteConfirmation = $state(false);
	
	// Helper functions
	
	/**
	 * Get equipment emoji by type
	 * @param {string} type
	 * @returns {string}
	 */
	function getEquipmentEmoji(type) {
		return MODAL_CONFIG.EQUIPMENT_EMOJIS[/** @type {keyof typeof MODAL_CONFIG.EQUIPMENT_EMOJIS} */ (type)] || '📦';
	}
	
	/**
	 * Initialize form data when equipment changes
	 */
	function initializeForm() {
		if (equipment) {
			formData = {
				name: equipment.name || '',
				type: equipment.type || '',
				serialNumber: equipment.serialNumber || '',
				clnNumber: equipment.clnNumber || '',
				inventoryNumber: equipment.inventoryNumber || '',
				roomLocation: equipment.roomLocation || '',
				damaged: equipment.damaged || false
			};
		}
		message = '';
	}
	
	/**
	 * Clear form and close modal
	 */
	function closeModal() {
		isLoading = false;
		message = '';
		isOpen = false;
	}
	
	/**
	 * Validate form data
	 * @returns {boolean}
	 */
	function validateForm() {
		if (!formData.name.trim() || !formData.type || !formData.serialNumber.trim()) {
			message = MODAL_CONFIG.MESSAGES.ERROR_REQUIRED_FIELDS;
			return false;
		}
		return true;
	}
	
	/**
	 * Handle save equipment
	 */
	async function handleSave() {
		if (!validateForm()) return;
		
		// Auto-generate CLN for computers if not provided
		let clnNumber = formData.clnNumber.trim();
		if (formData.type === 'Komputer' && !clnNumber) {
			clnNumber = await generateNextClnNumber();
		}
		
		try {
			isLoading = true;
			
			// Check if damage status changed
			const originalDamaged = equipment?.damaged || false;
			const newDamaged = formData.damaged;
			const damageStatusChanged = originalDamaged !== newDamaged;
			
			const response = await fetch('/api/equipment', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: equipment?.id,
					name: formData.name.trim(),
					type: formData.type,
					serialNumber: formData.serialNumber.trim(),
					clnNumber: clnNumber,
					inventoryNumber: formData.inventoryNumber.trim() || undefined,
					roomLocation: formData.roomLocation.trim() || undefined,
					damaged: formData.damaged
				})
			});
			
			if (!response.ok) {
				throw new Error('Failed to update equipment');
			}
			
			const updatedEquipment = await response.json();
			
			// If damage status changed, add to history
			if (damageStatusChanged && equipment?.id) {
				await updateEquipmentDamageStatus(
					equipment.id,
					newDamaged,
					null, // userId - could be added later if user authentication is implemented
					newDamaged ? "Oznaczono jako uszkodzone" : "Oznaczono jako naprawione"
				);
			}
			
			message = MODAL_CONFIG.MESSAGES.SUCCESS_UPDATE;
			onUpdate(updatedEquipment);
			
			setTimeout(() => {
				closeModal();
			}, MODAL_CONFIG.AUTO_CLOSE_DELAY);
			
		} catch (error) {
			console.error('Error updating equipment:', error);
			message = MODAL_CONFIG.MESSAGES.ERROR_UPDATE_GENERIC;
		} finally {
			isLoading = false;
		}
	}
	
	/**
	 * Handle delete equipment
	 */
	async function handleDelete() {
		if (!equipment) return;
		
		if (equipment.assignedUser) {
			message = MODAL_CONFIG.MESSAGES.ERROR_ASSIGNED_EQUIPMENT;
			return;
		}
		
		showDeleteConfirmation = true;
	}

	/**
	 * Confirm delete equipment
	 */
	async function confirmDelete() {
		if (!equipment) return;
		
		try {
			isLoading = true;
			showDeleteConfirmation = false;
			const result = await deleteEquipment(equipment.id);
			
			if (result.success) {
				message = MODAL_CONFIG.MESSAGES.SUCCESS_DELETE;
				onUpdate();
				
				setTimeout(() => {
					closeModal();
				}, MODAL_CONFIG.AUTO_CLOSE_DELAY * 2);
			} else {
				message = `${MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC}: ${result.error}`;
			}
		} catch (error) {
			console.error('Error deleting equipment:', error);
			message = MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Cancel delete confirmation
	 */
	function cancelDelete() {
		showDeleteConfirmation = false;
	}
	
	/**
	 * Handle backdrop click
	 * @param {MouseEvent} event
	 */
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}
	
	/**
	 * Handle keyboard events
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
	
	// Effects
	
	// Load equipment data when modal opens
	$effect(() => {
		if (isOpen && equipment) {
			initializeForm();
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
					class="text-green-100 hover:text-white transition-colors cursor-pointer"
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
					<div class={MODAL_CONFIG.STYLES.FORM_GROUP}>
						<div>
							<label for="edit-name" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.NAME}
							</label>
							<input
								id="edit-name"
								type="text"
								bind:value={formData.name}
								placeholder={MODAL_CONFIG.PLACEHOLDERS.NAME}
								class={MODAL_CONFIG.STYLES.INPUT}
							/>
						</div>
						
						<div>
							<label for="edit-type" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.TYPE}
							</label>
							<select
								id="edit-type"
								bind:value={formData.type}
								class={MODAL_CONFIG.STYLES.SELECT}
							>
								<option value="">{MODAL_CONFIG.PLACEHOLDERS.TYPE}</option>
								{#each MODAL_CONFIG.EQUIPMENT_TYPES as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
						
						<div>
							<label for="edit-serial" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.SERIAL_NUMBER}
							</label>
							<input
								id="edit-serial"
								type="text"
								bind:value={formData.serialNumber}
								placeholder={MODAL_CONFIG.PLACEHOLDERS.SERIAL_NUMBER}
								class={MODAL_CONFIG.STYLES.INPUT}
							/>
						</div>

						<div>
							<label for="edit-inventory" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.INVENTORY_NUMBER} <span class="text-gray-400">{MODAL_CONFIG.LABELS.OPTIONAL}</span>:
							</label>
							<input
								id="edit-inventory"
								type="text"
								bind:value={formData.inventoryNumber}
								placeholder={MODAL_CONFIG.PLACEHOLDERS.INVENTORY_NUMBER}
								class={MODAL_CONFIG.STYLES.INPUT}
							/>
						</div>

						{#if formData.type === 'Monitor' || formData.type === 'Drukarka'}
							<div>
								<label for="edit-room" class="block text-sm font-medium text-gray-700 mb-2">
									{MODAL_CONFIG.LABELS.ROOM_LOCATION} <span class="text-gray-400">{MODAL_CONFIG.LABELS.OPTIONAL}</span>:
								</label>
								<input
									id="edit-room"
									type="text"
									bind:value={formData.roomLocation}
									placeholder={MODAL_CONFIG.PLACEHOLDERS.ROOM_LOCATION}
									class={MODAL_CONFIG.STYLES.INPUT}
								/>
							</div>
						{/if}

						{#if formData.type === 'Komputer'}
							<div>
								<label for="edit-cln" class="block text-sm font-medium text-gray-700 mb-2">
									{MODAL_CONFIG.LABELS.CLN_NUMBER} <span class="text-gray-400">{MODAL_CONFIG.LABELS.OPTIONAL}</span>:
								</label>
								<input
									id="edit-cln"
									type="text"
									bind:value={formData.clnNumber}
									placeholder={MODAL_CONFIG.PLACEHOLDERS.CLN_NUMBER}
									class={MODAL_CONFIG.STYLES.INPUT}
								/>
							</div>
						{/if}

						<div class="flex items-center">
							<input
								id="edit-damaged"
								type="checkbox"
								bind:checked={formData.damaged}
								class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
							/>
							<label for="edit-damaged" class="ml-2 block text-sm text-gray-900">
								{MODAL_CONFIG.LABELS.DAMAGED}
							</label>
						</div>
					</div>
					
					{#if message}
						<div class={message.includes('✅') ? MODAL_CONFIG.STYLES.SUCCESS_MESSAGE : MODAL_CONFIG.STYLES.ERROR_MESSAGE}>
							<p class="text-sm" class:text-green-700={message.includes('✅')} class:text-red-700={message.includes('❌')}>
								{message}
							</p>
						</div>
					{/if}
				{/if}
			</div>
			
			<!-- Modal footer -->
			<div class={MODAL_CONFIG.STYLES.FOOTER}>
				{#if equipment && equipment.assignedUser}
					<div class={MODAL_CONFIG.STYLES.WARNING_BOX}>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-yellow-700">
									<strong>Nie można usunąć tego sprzętu</strong> - {MODAL_CONFIG.MESSAGES.WARNING_CANT_DELETE}
								</p>
							</div>
						</div>
					</div>
				{/if}
				<div class="flex justify-end">
					<div class="space-x-3 flex items-center">
						{#if equipment && !equipment.assignedUser}
							<button
								onclick={handleDelete}
								disabled={isLoading}
								class={MODAL_CONFIG.STYLES.BUTTON_DANGER}
							>
								{#if isLoading}
									{MODAL_CONFIG.MESSAGES.LOADING_DELETE}
								{:else}
									{MODAL_CONFIG.LABELS.DELETE}
								{/if}
							</button>
						{/if}
						<button
							onclick={closeModal}
							disabled={isLoading}
							class={MODAL_CONFIG.STYLES.BUTTON_SECONDARY}
						>
							{MODAL_CONFIG.LABELS.CANCEL}
						</button>
						<button
							onclick={handleSave}
							disabled={isLoading}
							class={MODAL_CONFIG.STYLES.BUTTON_PRIMARY}
						>
							{#if isLoading}
								{MODAL_CONFIG.MESSAGES.LOADING_SAVE}
							{:else}
								{MODAL_CONFIG.LABELS.SAVE}
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmation && equipment}
	<div 
		class={MODAL_CONFIG.STYLES.DELETE_MODAL_BASE}
		onclick={cancelDelete}
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-equipment-modal-title"
		onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			class={MODAL_CONFIG.STYLES.DELETE_MODAL_CONTENT}
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center mb-4">
				<div class="text-3xl mr-3">🗑️</div>
				<h3 id="delete-equipment-modal-title" class="text-lg font-semibold text-gray-900">Potwierdzenie usunięcia sprzętu</h3>
			</div>
			
			<div class="mb-6">
				<p class="text-gray-700 mb-2">
					{MODAL_CONFIG.MESSAGES.DELETE_CONFIRMATION}
				</p>
				<div class={MODAL_CONFIG.STYLES.DELETE_EQUIPMENT_INFO}>
					<div class="flex items-center">
						<span class="text-2xl mr-2">{getEquipmentEmoji(equipment.type)}</span>
						<div>
							<div class="font-medium text-gray-900">{equipment.name}</div>
							<div class="text-sm text-gray-500">S/N: {equipment.serialNumber}</div>
							{#if equipment.clnNumber}
								<div class="text-sm text-gray-500">CLN: {equipment.clnNumber}</div>
							{/if}
						</div>
					</div>
				</div>
				<p class="text-red-600 text-sm mt-2">
					{MODAL_CONFIG.MESSAGES.DELETE_WARNING}
				</p>
			</div>
			
			<div class="flex space-x-3 justify-end">
				<button
					onclick={cancelDelete}
					class={MODAL_CONFIG.STYLES.BUTTON_SECONDARY}
				>
					{MODAL_CONFIG.LABELS.CANCEL}
				</button>
				<button
					onclick={confirmDelete}
					class={MODAL_CONFIG.STYLES.BUTTON_DANGER}
				>
					{MODAL_CONFIG.LABELS.DELETE}
				</button>
			</div>
		</div>
	</div>
{/if}
