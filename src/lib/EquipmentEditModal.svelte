<script>
	import { addEquipment, deleteEquipment, updateEquipmentDamageStatus } from '$lib/data.js';
	
	/** @typedef {{id: number, name: string, type: string, serialNumber: string, inventoryNumber?: string, roomLocation?: string, assignedUser?: {name: string, email: string}, lastModified?: string, damaged?: boolean}} Equipment */
	/** @typedef {{name: string, type: string, serialNumber: string, inventoryNumber: string, roomLocation: string, damaged: boolean}} EquipmentFormData */
	/** @typedef {{isOpen: boolean, equipment: Equipment|null, onUpdate: Function}} EquipmentEditModalProps */
	
	/** @type {EquipmentEditModalProps} */
	let { isOpen = $bindable(), equipment, onUpdate } = $props();
	
	// Konfiguracja modala
	const MODAL_CONFIG = {
		TITLE: '✏️ Edytuj Sprzęt',
		LABELS: {
			NAME: 'Nazwa sprzętu:',
			TYPE: 'Typ sprzętu:',
			SERIAL_NUMBER: 'Numer seryjny:',
			INVENTORY_NUMBER: 'Numer inwentarzowy',
			ROOM_LOCATION: 'Lokalizacja/Pokój',
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
			ROOM_LOCATION: 'Pokój 101, Sala konferencyjna A, Recepcja...'
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
			DELETE_WARNING: 'Ta operacja jest nieodwracalna!'
		},
		EQUIPMENT_TYPES: ['Komputer', 'Monitor', 'Drukarka', 'Myszka', 'Klawiatura', 'Zasilacz', 'Stacja dokująca', 'YubiKey'],
		STYLES: {
			INPUT: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			BUTTON_PRIMARY: 'px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
			BUTTON_SECONDARY: 'px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors',
			BUTTON_DANGER: 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
		}
	};
	
	// Stan formularza
	let formData = $state({
		name: '',
		type: '',
		serialNumber: '',
		inventoryNumber: '',
		roomLocation: '',
		damaged: false
	});
	
	let isLoading = $state(false);
	let message = $state('');
	let showDeleteConfirmation = $state(false);
	
	// Funkcje pomocnicze
	/**
	 * Waliduj formularz przed zapisaniem
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
	 * Inicjalizuj formularz z danymi sprzętu (przy edycji) lub wyczyść (przy dodawaniu)
	 */
	function initializeForm() {
		if (equipment) {
			formData = {
				name: equipment.name || '',
				type: equipment.type || '',
				serialNumber: equipment.serialNumber || '',
				inventoryNumber: equipment.inventoryNumber || '',
				roomLocation: equipment.roomLocation || '',
				damaged: equipment.damaged || false
			};
		}
		message = '';
	}
	
	/**
	 * Wyczyść formularz i zamknij modal
	 */
	function handleClose() {
		formData = {
			name: '',
			type: '',
			serialNumber: '',
			inventoryNumber: '',
			roomLocation: '',
			damaged: false
		};
		message = '';
		showDeleteConfirmation = false;
		isOpen = false;
	}
	
	/**
	 * Obsłuż zapisanie formularza
	 */
	async function handleSave() {
		if (!validateForm() || !equipment) return;
		
		try {
			isLoading = true;
			
			// Sprawdź, czy zmienił się status uszkodzenia
			const originalDamaged = equipment.damaged || false;
			const newDamaged = formData.damaged;
			const damageStatusChanged = originalDamaged !== newDamaged;
			
			const response = await fetch('/api/equipment', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: equipment.id,
					name: formData.name.trim(),
					type: formData.type,
					serialNumber: formData.serialNumber.trim(),
					inventoryNumber: formData.inventoryNumber.trim() || undefined,
					roomLocation: formData.roomLocation.trim() || undefined,
					damaged: formData.damaged
				})
			});
			
			if (!response.ok) {
				throw new Error('Failed to update equipment');
			}
			
			const updatedEquipment = await response.json();
			
			// Jeśli zmienił się status uszkodzenia, dodaj wpis do historii
			if (damageStatusChanged) {
				const action = newDamaged ? 'Oznaczono jako uszkodzony' : 'Oznaczono jako naprawiony';
				const details = `${equipment.name} (S/N: ${equipment.serialNumber})`;
				
				await fetch('/api/history', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						action: action,
						details: details,
						equipmentId: equipment.id
					})
				});
			}
			
			message = MODAL_CONFIG.MESSAGES.SUCCESS_UPDATE;
			if (onUpdate) onUpdate();
			handleClose();
		} catch (error) {
			console.error('Update error:', error);
			message = MODAL_CONFIG.MESSAGES.ERROR_UPDATE_GENERIC;
		} finally {
			isLoading = false;
		}
	}
	
	/**
	 * Rozpocznij proces usuwania sprzętu
	 */
	function startDelete() {
		showDeleteConfirmation = true;
	}
	
	/**
	 * Anuluj usuwanie sprzętu
	 */
	function cancelDelete() {
		showDeleteConfirmation = false;
	}
	
	/**
	 * Potwierdź usunięcie sprzętu
	 */
	async function confirmDelete() {
		if (!equipment) return;
		
		try {
			isLoading = true;
			const success = await deleteEquipment(equipment.id);
			if (success) {
				message = MODAL_CONFIG.MESSAGES.SUCCESS_DELETE;
				if (onUpdate) onUpdate();
				handleClose();
			} else {
				message = MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC;
			}
		} catch (error) {
			console.error('Delete error:', error);
			message = MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Pobierz emoji dla danego typu sprzętu
	 * @param {string} type 
	 * @returns {string}
	 */
	function getEquipmentEmoji(type) {
		switch (type) {
			case 'Komputer': return '💻';
			case 'Monitor': return '🖥️';
			case 'Drukarka': return '🖨️';
			case 'Myszka': return '🖱️';
			case 'Klawiatura': return '⌨️';
			case 'Zasilacz': return '🔌';
			case 'Stacja dokująca': return '🔗';
			case 'YubiKey': return '🔑';
			default: return '📦';
		}
	}
	
	// Efekty
	$effect(() => {
		initializeForm();
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onclick={handleClose}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 class="text-xl font-semibold text-gray-900">
					{equipment ? '✏️ Edytuj Sprzęt' : '➕ Dodaj Nowy Sprzęt'}
				</h2>
				<button
					onclick={handleClose}
					class="text-gray-400 hover:text-gray-600 transition-colors p-1"
					aria-label={MODAL_CONFIG.LABELS.CLOSE_MODAL}
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			{#if !showDeleteConfirmation}
				<form class="p-6 space-y-4" onsubmit={(e) => {e.preventDefault(); handleSave()}}>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="md:col-span-2">
							<label for="edit-name" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.NAME}
							</label>
							<input
								id="edit-name"
								type="text"
								bind:value={formData.name}
								placeholder={MODAL_CONFIG.PLACEHOLDERS.NAME}
								class={MODAL_CONFIG.STYLES.INPUT}
								required
							/>
						</div>
						
						<div>
							<label for="edit-type" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.TYPE}
							</label>
							<select
								id="edit-type"
								bind:value={formData.type}
								class={MODAL_CONFIG.STYLES.INPUT}
								required
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
								required
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
						<div class="mt-4 p-3 rounded-md {message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">
							<p class="text-sm">{message}</p>
						</div>
					{/if}
					
					<div class="flex space-x-3 pt-4">
						<button
							type="submit"
							disabled={isLoading}
							class={MODAL_CONFIG.STYLES.BUTTON_PRIMARY}
						>
							{isLoading ? '⏳ Zapisywanie...' : MODAL_CONFIG.LABELS.SAVE}
						</button>
						
						{#if equipment}
							<button
								type="button"
								onclick={startDelete}
								class={MODAL_CONFIG.STYLES.BUTTON_DANGER}
								disabled={isLoading}
							>
								{MODAL_CONFIG.LABELS.DELETE}
							</button>
						{/if}
						
						<button
							type="button"
							onclick={handleClose}
							class={MODAL_CONFIG.STYLES.BUTTON_SECONDARY}
							disabled={isLoading}
						>
							{MODAL_CONFIG.LABELS.CANCEL}
						</button>
					</div>
				</form>
			{:else}
				<!-- Potwierdzenie usunięcia -->
				<div class="p-6">
					<div class="flex items-center mb-4">
						<div class="flex-shrink-0">
							<svg class="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z"/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900">Potwierdź usunięcie</h3>
							<div class="mt-2">
								<p class="text-sm text-gray-500">
									Czy na pewno chcesz usunąć ten sprzęt?
								</p>
							</div>
						</div>
					</div>
					
					<div class="bg-gray-50 rounded-lg p-4 mb-4">
						<div class="flex items-center">
							<span class="text-2xl mr-2">{equipment ? getEquipmentEmoji(equipment.type) : '📦'}</span>
							<div>
								<div class="font-medium text-gray-900">{equipment?.name || 'Nieznany sprzęt'}</div>
								<div class="text-sm text-gray-500">S/N: {equipment?.serialNumber || 'Brak'}</div>
							</div>
						</div>
					</div>
					<p class="text-red-600 text-sm mt-2">
						{MODAL_CONFIG.MESSAGES.DELETE_WARNING}
					</p>
				</div>
				
				<div class="flex space-x-3 justify-end p-6">
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
			{/if}
		</div>
	</div>
{/if}
