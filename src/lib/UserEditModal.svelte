<script>
	import { deleteUser, getEquipmentByUserId } from '$lib/data.js';
	
	/** @typedef {Object} User @property {number} id @property {string} name @property {string} email */
	/** @typedef {Object} UserFormData @property {string} name @property {string} email */
	/** @typedef {Object} UserEditModalProps @property {boolean} isOpen @property {User} user @property {Function} onUpdate */
	
	/** @type {UserEditModalProps} */
	let { isOpen = $bindable(), user, onUpdate } = $props();
	
	// Konfiguracja modala
	const MODAL_CONFIG = {
		TITLE: '✏️ Edytuj Użytkownika',
		MESSAGES: {
			SUCCESS_UPDATE: '✅ Użytkownik został zaktualizowany pomyślnie',
			SUCCESS_DELETE: '✅ Użytkownik został usunięty pomyślnie',
			ERROR_REQUIRED_FIELDS: '❌ Wszystkie pola są wymagane',
			ERROR_INVALID_EMAIL: '❌ Podaj poprawny adres email',
			ERROR_USER_HAS_EQUIPMENT: '❌ Nie można usunąć użytkownika, który ma przypisany sprzęt',
			ERROR_UPDATE_GENERIC: '❌ Błąd podczas aktualizacji użytkownika',
			ERROR_DELETE_GENERIC: '❌ Błąd podczas usuwania użytkownika',
			WARNING_CANT_DELETE: 'Nie można usunąć tego użytkownika - ma przypisany sprzęt. Aby usunąć użytkownika, najpierw odepnij od niego cały sprzęt.',
			DELETE_CONFIRMATION: 'Czy na pewno chcesz usunąć użytkownika:',
			DELETE_WARNING: '⚠️ Ta operacja jest nieodwracalna!'
		},
		LABELS: {
			NAME: 'Imię i nazwisko:',
			EMAIL: 'Email:',
			ASSIGNED_EQUIPMENT: 'Przypisany sprzęt:',
			SAVE: '💾 Zapisz zmiany',
			DELETE: '🗑️ Usuń użytkownika',
			CANCEL: 'Anuluj',
			CLOSE: 'Zamknij modal'
		},
		PLACEHOLDERS: {
			NAME: 'Jan Kowalski',
			EMAIL: 'jan.kowalski@firma.pl'
		},
		VALIDATION: {
			EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		},
		STYLES: {
			MODAL_BASE: 'fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-4 z-50',
			MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden',
			HEADER: 'bg-green-600 px-6 py-4 flex items-center justify-between',
			FORM_GROUP: 'space-y-4',
			INPUT: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500',
			INFO_BOX: 'bg-gray-50 p-3 rounded-md',
			SUCCESS_MESSAGE: 'mt-4 p-3 rounded-md bg-green-50',
			ERROR_MESSAGE: 'mt-4 p-3 rounded-md bg-red-50',
			WARNING_BOX: 'mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md',
			BUTTON_PRIMARY: 'px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
			BUTTON_DANGER: 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
			BUTTON_SECONDARY: 'px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
		},
		AUTO_CLOSE_DELAY: 1500
	};
	
	// Stan formularza
	/** @type {UserFormData} */
	let formData = $state({
		name: '',
		email: ''
	});

	let isLoading = $state(false);
	let message = $state('');
	let userEquipmentCount = $state(0);
	let showDeleteConfirmation = $state(false);

	// Funkcje pomocnicze
	
	/**
	 * Inicjalizuj dane formularza, gdy zmienia się użytkownik
	 */
	function initializeForm() {
		if (user) {
			formData = {
				name: user.name || '',
				email: user.email.trim() || ''
			};
			message = '';
		}
	}
	
	/**
	 * Waliduj dane formularza
	 * @returns {string|null} Komunikat błędu lub null, jeśli dane są poprawne
	 */
	function validateForm() {
		if (!formData.name.trim() || !formData.email.trim()) {
			return MODAL_CONFIG.MESSAGES.ERROR_REQUIRED_FIELDS;
		}
		
		if (!MODAL_CONFIG.VALIDATION.EMAIL_REGEX.test(formData.email.trim())) {
			return MODAL_CONFIG.MESSAGES.ERROR_INVALID_EMAIL;
		}
		
		return null;
	}
	
	/**
	 * Ustaw komunikat z automatycznym czyszczeniem
	 * @param {string} msg
	 * @param {boolean} isError
	 */
	function setMessage(msg, isError = false) {
		message = msg;
		if (!isError && msg.includes('✅')) {
			setTimeout(() => {
				message = '';
			}, MODAL_CONFIG.AUTO_CLOSE_DELAY);
		}
	}
	
	/**
	 * Załaduj liczbę sprzętu przypisanego do użytkownika
	 */
	async function loadUserEquipmentCount() {
		if (!user) return;
		
		try {
			const equipment = await getEquipmentByUserId(user.id);
			userEquipmentCount = equipment.length;
		} catch (error) {
			console.error('Error loading user equipment count:', error);
			userEquipmentCount = 0;
		}
	}
	
	/**
	 * Zamknij modal i zresetuj stan
	 */
	function closeModal() {
		isOpen = false;
		message = '';
		showDeleteConfirmation = false;
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

	// Efekt inicjalizacji formularza, gdy modal się otwiera
	$effect(() => {
		if (isOpen && user) {
			initializeForm();
			loadUserEquipmentCount();
		}
	});
	
	/**
	 * Obsłuż zapis formularza
	 */
	async function handleSave() {
		const validationError = validateForm();
		if (validationError) {
			setMessage(validationError, true);
			return;
		}
		
		try {
			isLoading = true;
			
			// Zaktualizuj użytkownika przez API - użycie scentralizowanego podejścia
			const response = await fetch('/api/users', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: user.id,
					name: formData.name.trim(),
					email: formData.email.trim()
				})
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update user');
			}
			
			setMessage(MODAL_CONFIG.MESSAGES.SUCCESS_UPDATE);
			onUpdate();
			
			setTimeout(() => {
				closeModal();
			}, MODAL_CONFIG.AUTO_CLOSE_DELAY);
			
		} catch (error) {
			console.error('Error updating user:', error);
			const errorMessage = `${MODAL_CONFIG.MESSAGES.ERROR_UPDATE_GENERIC}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`;
			setMessage(errorMessage, true);
		} finally {
			isLoading = false;
		}
	}
	
	/**
	 * Obsłuż usunięcie użytkownika
	 */
	async function handleDelete() {
		if (!user) return;
		
		if (userEquipmentCount > 0) {
			setMessage(MODAL_CONFIG.MESSAGES.ERROR_USER_HAS_EQUIPMENT, true);
			return;
		}
		
		showDeleteConfirmation = true;
	}

	/**
	 * Potwierdź usunięcie użytkownika
	 */
	async function confirmDelete() {
		if (!user) return;
		
		try {
			isLoading = true;
			showDeleteConfirmation = false;
			const result = await deleteUser(user.id);
			
			if (result.success) {
				setMessage(MODAL_CONFIG.MESSAGES.SUCCESS_DELETE);
				onUpdate();
				
				setTimeout(() => {
					closeModal();
				}, MODAL_CONFIG.AUTO_CLOSE_DELAY);
			} else {
				const errorMessage = `${MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC}: ${result.error}`;
				setMessage(errorMessage, true);
			}
		} catch (error) {
			console.error('Error deleting user:', error);
			setMessage(MODAL_CONFIG.MESSAGES.ERROR_DELETE_GENERIC, true);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Anuluj usunięcie
	 */
	function cancelDelete() {
		showDeleteConfirmation = false;
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
					{MODAL_CONFIG.TITLE}
				</h2>
				<button
					onclick={closeModal}
					class="text-green-100 hover:text-white transition-colors cursor-pointer"
					aria-label={MODAL_CONFIG.LABELS.CLOSE}
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
			
			<!-- Modal content -->
			<div class="p-6">
				{#if user}
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
							<label for="edit-email" class="block text-sm font-medium text-gray-700 mb-2">
								{MODAL_CONFIG.LABELS.EMAIL}
							</label>
							<input
								id="edit-email"
								type="email"
								bind:value={formData.email}
								placeholder={MODAL_CONFIG.PLACEHOLDERS.EMAIL}
								class={MODAL_CONFIG.STYLES.INPUT}
							/>
						</div>

						<div class={MODAL_CONFIG.STYLES.INFO_BOX}>
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm text-gray-600">
										<strong>{MODAL_CONFIG.LABELS.ASSIGNED_EQUIPMENT}</strong> {userEquipmentCount} {userEquipmentCount === 1 ? 'pozycja' : userEquipmentCount < 5 ? 'pozycje' : 'pozycji'}
									</p>
								</div>
							</div>
						</div>
					</div>
					
					{#if message}
						<div 
							class={message.includes('✅') ? MODAL_CONFIG.STYLES.SUCCESS_MESSAGE : MODAL_CONFIG.STYLES.ERROR_MESSAGE}
						>
							<p class="text-sm" class:text-green-700={message.includes('✅')} class:text-red-700={message.includes('❌')}>
								{message}
							</p>
						</div>
					{/if}
				{/if}
			</div>
			<!-- Modal footer -->
			<div class="bg-gray-50 px-6 py-4">
				{#if user && userEquipmentCount > 0}
					<div class={MODAL_CONFIG.STYLES.WARNING_BOX}>
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm text-yellow-700">
									<strong>{MODAL_CONFIG.MESSAGES.WARNING_CANT_DELETE}</strong>
								</p>
							</div>
						</div>
					</div>
				{/if}
				<div class="flex justify-end">
					<div class="space-x-3 flex items-center">
						{#if user && userEquipmentCount === 0}
							<button
								onclick={handleDelete}
								disabled={isLoading}
								class={MODAL_CONFIG.STYLES.BUTTON_DANGER}
							>
								{#if isLoading}
									Usuwanie...
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
								Zapisywanie...
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
{#if showDeleteConfirmation && user}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		onclick={cancelDelete}
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-user-modal-title"
		onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" 
			role="document"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center mb-4">
				<div class="text-3xl mr-3">🗑️</div>
				<h3 id="delete-user-modal-title" class="text-lg font-semibold text-gray-900">
					Potwierdzenie usunięcia użytkownika
				</h3>
			</div>
			
			<div class="mb-6">
				<p class="text-gray-700 mb-2">
					{MODAL_CONFIG.MESSAGES.DELETE_CONFIRMATION}
				</p>
				<div class="bg-gray-50 p-3 rounded-md border">
					<div class="flex items-center">
						<span class="text-2xl mr-2">👤</span>
						<div>
							<div class="font-medium text-gray-900">{user.name}</div>
							<div class="text-sm text-gray-500">{user.email}</div>
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
					class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-150 font-medium"
				>
					{MODAL_CONFIG.LABELS.CANCEL}
				</button>
				<button
					onclick={confirmDelete}
					class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-150 font-medium"
				>
					Usuń użytkownika
				</button>
			</div>
		</div>
	</div>
{/if}
