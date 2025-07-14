<script>
	// Centralna konfiguracja aplikacji
	const APP_CONFIG = {
		fileTypes: {
			valid: [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			],
			icons: {
				pdf: '📄',
				doc: '📝',
				docx: '📝',
				default: '📎'
			},
			extensions: ['PDF', 'DOC', 'DOCX']
		},
		upload: {
			maxFileSize: 10 * 1024 * 1024, // 10MB
			maxFileSizeLabel: '10MB'
		},
		messages: {
			autoHideDelay: 5000,
			shortDelay: 3000,
			types: {
				success: { icon: '✅', bgClass: 'bg-green-100', textClass: 'text-green-700' },
				error: { icon: '❌', bgClass: 'bg-red-100', textClass: 'text-red-700' }
			}
		},
		modals: {
			category: {
				add: { title: 'Dodaj firmę', icon: '🏢', action: 'Dodaj' },
				edit: { title: 'Edytuj firmę', icon: '🏢', action: 'Zapisz' }
			},
			deleteDocument: { title: 'Potwierdzenie usunięcia', icon: '🗑️' },
			deleteCategory: { title: 'Potwierdzenie usunięcia firmy', icon: '🗑️' }
		},
		defaultCategory: { id: 1, name: 'Ogólne' }
	};

	// Typy
	/** @typedef {{id: number, name: string, size: string, uploadDate: string, categoryId: number, description?: string}} Document */
	/** @typedef {{id: number, name: string, description: string, createdDate: string}} Category */

	// Zarządzanie stanem
	/** @type {Array<Document>} */
	let documents = $state([]);
	/** @type {Array<Category>} */
	let categories = $state([]);
	/** @type {FileList | null} */
	let selectedFiles = $state(null);
	let isLoading = $state(true);
	let isUploading = $state(false);
	let isExporting = $state(false);
	let uploadMessage = $state('');
	let dragOver = $state(false);
	
	// Stany modali
	let showDeleteModal = $state(false);
	let showCategoryModal = $state(false);
	let showDeleteCategoryModal = $state(false);
	/** @type {'add' | 'edit'} */
	let categoryModalMode = $state('add');
	/** @type {Document | null} */
	let documentToDelete = $state(null);
	/** @type {Category | null} */
	let categoryToEdit = $state(null);
	/** @type {Category | null} */
	let categoryToDelete = $state(null);
	
	// Stany formularza
	let selectedCategoryId = $state(APP_CONFIG.defaultCategory.id);
	let newCategoryName = $state('');
	let newCategoryDescription = $state('');
	/** @type {number | null} */
	let filteredCategoryId = $state(null);

	// Obliczenia pochodne
	const filteredDocuments = $derived(
		filteredCategoryId === null 
			? documents 
			: documents.filter(doc => doc.categoryId === filteredCategoryId)
	);

	const currentCategoryName = $derived(
		filteredCategoryId ? getCategoryName(filteredCategoryId) : 'Wszystkie'
	);

	// Efekty
	$effect(() => {
		loadData();
	});
	// Funkcje narzędziowe
	/**
	 * @param {string} message
	 * @returns {'success' | 'error'}
	 */
	function getMessageType(message) {
		return message.includes('✅') ? 'success' : 'error';
	}

	/**
	 * @param {string} message
	 * @returns {{container: string, text: string}}
	 */
	function getMessageClasses(message) {
		const messageType = getMessageType(message);
		const config = APP_CONFIG.messages.types[messageType];
		return {
			container: `mt-4 p-3 rounded-md ${config.bgClass}`,
			text: `text-sm ${config.textClass}`
		};
	}

	/**
	 * @param {string} message
	 * @param {number} delay
	 */
	function showMessage(message, delay = APP_CONFIG.messages.autoHideDelay) {
		uploadMessage = message;
		setTimeout(() => {
			uploadMessage = '';
		}, delay);
	}

	/**
	 * @param {File} file
	 */
	function isValidFileType(file) {
		return APP_CONFIG.fileTypes.valid.includes(file.type);
	}

	/**
	 * @param {string} filename
	 */
	function getFileIcon(filename) {
		const ext = filename.toLowerCase().split('.').pop();
		if (!ext) return APP_CONFIG.fileTypes.icons.default;
		
		switch (ext) {
			case 'pdf':
				return APP_CONFIG.fileTypes.icons.pdf;
			case 'doc':
			case 'docx':
				return APP_CONFIG.fileTypes.icons.doc;
			default:
				return APP_CONFIG.fileTypes.icons.default;
		}
	}

	/**
	 * @param {string} size
	 */
	function formatFileSize(size) {
		const sizeNum = parseInt(size);
		if (sizeNum < 1024) return `${sizeNum} B`;
		if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`;
		return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * @param {number} categoryId
	 */
	function getCategoryName(categoryId) {
		const category = categories.find(cat => cat.id === categoryId);
		return category ? category.name : 'Nieznana firma';
	}

	// Funkcje ładowania danych
	async function loadData() {
		try {
			await Promise.all([loadDocuments(), loadCategories()]);
		} catch (error) {
			console.error('Error loading data:', error);
		}
	}
	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			if (response.ok) {
				categories = await response.json();
				// Ustaw domyślną kategorię, jeśli żadna nie jest wybrana
				if (categories.length > 0 && !selectedCategoryId) {
					selectedCategoryId = categories[0].id;
				}
			}
		} catch (error) {
			console.error('Error loading categories:', error);
		}
	}
	
	async function loadDocuments() {
		try {
			isLoading = true;
			const response = await fetch('/api/documents');
			if (response.ok) {
				documents = await response.json();
			}
		} catch (error) {
			console.error('Error loading documents:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Funkcje przesyłania plików
	/**
	 * @param {Event} event
	 */
	async function handleFileUpload(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		const files = target.files;
		if (!files || files.length === 0) return;
		
		await uploadFiles(files);
		// Resetuj input
		target.value = '';
	}

	/**
	 * @param {File} file
	 * @returns {{valid: boolean, error?: string}}
	 */
	function validateFile(file) {
		if (!isValidFileType(file)) {
			return {
				valid: false,
				error: `❌ Plik ${file.name} ma nieobsługiwany format. Dozwolone: ${APP_CONFIG.fileTypes.extensions.join(', ')}`
			};
		}
		
		if (file.size > APP_CONFIG.upload.maxFileSize) {
			return {
				valid: false,
				error: `❌ Plik ${file.name} jest za duży. Maksymalny rozmiar: ${APP_CONFIG.upload.maxFileSizeLabel}`
			};
		}
		
		return { valid: true };
	}
	
	/**
	 * @param {FileList} files
	 */
	async function uploadFiles(files) {
		isUploading = true;
		uploadMessage = '';
		
		try {
			const formData = new FormData();
			formData.append('categoryId', selectedCategoryId.toString());
			
			let validFiles = 0;
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const validation = validateFile(file);
				
				if (!validation.valid && validation.error) {
					showMessage(validation.error);
					continue;
				}
				
				formData.append('files', file);
				validFiles++;
			}
			
			if (validFiles === 0) return;
			
			const response = await fetch('/api/documents', {
				method: 'POST',
				body: formData
			});
			
			if (response.ok) {
				const result = await response.json();
				showMessage(`✅ Przesłano ${result.uploaded} plików pomyślnie`);
				loadDocuments();
			} else {
				showMessage('❌ Błąd podczas przesyłania plików');
			}
		} catch (error) {
			console.error('Upload error:', error);
			showMessage('❌ Błąd podczas przesyłania plików');
		} finally {
			isUploading = false;
		}
	}
	
	// Obsługa przeciągania i upuszczania
	/**
	 * @param {DragEvent} event
	 */
	function handleDragOver(event) {
		event.preventDefault();
		dragOver = true;
	}
	
	/**
	 * @param {DragEvent} event
	 */
	function handleDragLeave(event) {
		event.preventDefault();
		dragOver = false;
	}
	
	/**
	 * @param {DragEvent} event
	 */
	async function handleDrop(event) {
		event.preventDefault();
		dragOver = false;
		
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			await uploadFiles(files);
		}
	}

	// Funkcje zarządzania dokumentami
	/**
	 * @param {number} documentId
	 */
	async function deleteDocument(documentId) {
		const document = documents.find(doc => doc.id === documentId);
		if (!document) return;
		
		documentToDelete = document;
		showDeleteModal = true;
	}
	
	/**
	 * Potwierdź usunięcie i faktycznie usuń dokument
	 */
	async function confirmDelete() {
		if (!documentToDelete) return;
		
		const docName = documentToDelete.name;
		
		try {
			const response = await fetch('/api/documents', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: documentToDelete.id })
			});
			
			const result = await response.json();
			
			if (response.ok) {
				loadDocuments();
				showMessage(`✅ Dokument "${docName}" został usunięty`);
			} else {
				console.error('Delete failed:', result);
				showMessage(`❌ ${result.error || result.message || 'Błąd podczas usuwania dokumentu'}`);
			}
		} catch (error) {
			console.error('Delete error:', error);
			showMessage('❌ Błąd podczas usuwania dokumentu');
		} finally {
			closeDeleteModal();
		}
	}
	
	function closeDeleteModal() {
		showDeleteModal = false;
		documentToDelete = null;
	}
	
	// Funkcje zarządzania kategoriami
	/**
	 * @param {'add' | 'edit'} mode
	 * @param {Category | null} category
	 */
	function openCategoryModal(mode, category = null) {
		categoryModalMode = mode;
		categoryToEdit = category;
		
		if (mode === 'edit' && category) {
			newCategoryName = category.name;
			newCategoryDescription = category.description;
		} else {
			newCategoryName = '';
			newCategoryDescription = '';
		}
		
		showCategoryModal = true;
	}
	
	function closeCategoryModal() {
		showCategoryModal = false;
		categoryToEdit = null;
		newCategoryName = '';
		newCategoryDescription = '';
	}
	
	/**
	 * Zapisz kategorię (dodaj lub edytuj)
	 */
	async function saveCategory() {
		if (!newCategoryName.trim()) {
			showMessage('❌ Nazwa firmy jest wymagana', APP_CONFIG.messages.shortDelay);
			return;
		}
		
		try {
			const method = categoryModalMode === 'add' ? 'POST' : 'PUT';
			const body = categoryModalMode === 'add' 
				? { name: newCategoryName.trim(), description: newCategoryDescription.trim() }
				: { id: categoryToEdit?.id, name: newCategoryName.trim(), description: newCategoryDescription.trim() };
			
			const response = await fetch('/api/categories', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			
			if (response.ok) {
				loadCategories();
				closeCategoryModal();
				
				const action = categoryModalMode === 'add' ? 'dodana' : 'zaktualizowana';
				showMessage(`✅ Firma została ${action}`, APP_CONFIG.messages.shortDelay);
			} else {
				const result = await response.json();
				showMessage(`❌ ${result.error || 'Błąd podczas zapisywania firmy'}`, APP_CONFIG.messages.shortDelay);
			}
		} catch (error) {
			console.error('Error saving category:', error);
			showMessage('❌ Błąd podczas zapisywania firmy', APP_CONFIG.messages.shortDelay);
		}
	}
	
	/**
	 * Usuń kategorię
	 * @param {any} category
	 */
	async function deleteCategory(category) {
		categoryToDelete = category;
		showDeleteCategoryModal = true;
	}

	/**
	 * Potwierdź usunięcie kategorii i faktycznie usuń kategorię
	 */
	async function confirmDeleteCategory() {
		if (!categoryToDelete) return;
		
		const categoryName = categoryToDelete.name;
		
		try {
			const response = await fetch('/api/categories', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: categoryToDelete.id })
			});
			
			if (response.ok) {
				loadCategories();
				showMessage(`✅ Firma "${categoryName}" została usunięta`, APP_CONFIG.messages.shortDelay);
			} else {
				const result = await response.json();
				showMessage(`❌ ${result.error || 'Błąd podczas usuwania firmy'}`, APP_CONFIG.messages.shortDelay);
			}
		} catch (error) {
			console.error('Error deleting category:', error);
			showMessage('❌ Błąd podczas usuwania firmy', APP_CONFIG.messages.shortDelay);
		} finally {
			closeDeleteCategoryModal();
		}
	}

	function closeDeleteCategoryModal() {
		showDeleteCategoryModal = false;
		categoryToDelete = null;
	}
	
	// Funkcje filtrowania
	/**
	 * @param {number|null} categoryId
	 */
	function filterByCategory(categoryId) {
		filteredCategoryId = categoryId;
	}

	function clearFilter() {
		filteredCategoryId = null;
	}

	// Funkcje eksportu
	/**
	 * @param {number|null} categoryId
	 */
	async function exportDocuments(categoryId = null) {
		isExporting = true;
		try {
			const params = new URLSearchParams();
			if (categoryId) {
				params.append('categoryId', categoryId.toString());
			}
			
			const response = await fetch(`/api/documents/export${params.toString() ? '?' + params.toString() : ''}`);
			
			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				
				// Generuj nazwę pliku
				const categoryName = categoryId ? getCategoryName(categoryId) : 'wszystkie_dokumenty';
				const date = new Date().toISOString().split('T')[0];
				a.download = `dokumenty_${categoryName}_${date}.zip`;
				
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
				
				showMessage('✅ Dokumenty zostały wyeksportowane', APP_CONFIG.messages.shortDelay);
			} else {
				showMessage('❌ Błąd podczas eksportu dokumentów', APP_CONFIG.messages.shortDelay);
			}
		} catch (error) {
			console.error('Export error:', error);
			showMessage('❌ Błąd podczas eksportu dokumentów', APP_CONFIG.messages.shortDelay);
		} finally {
			isExporting = false;
		}
	}

	/**
	 * @param {number} categoryId
	 * @returns {number}
	 */
	function getDocumentCountForCategory(categoryId) {
		return documents.filter(doc => doc.categoryId === categoryId).length;
	}

	/**
	 * @param {'primary' | 'secondary' | 'danger'} type
	 * @param {string} label
	 * @param {() => void} onclick
	 * @param {boolean} disabled
	 * @returns {object}
	 */
	function getButtonProps(type, label, onclick, disabled = false) {
		const baseClasses = "px-4 py-2 rounded-md transition-colors duration-150 font-medium";
		const typeClasses = {
			primary: "text-white bg-blue-600 hover:bg-blue-700",
			secondary: "text-gray-700 bg-gray-200 hover:bg-gray-300", 
			danger: "text-white bg-red-600 hover:bg-red-700"
		};
		
		return {
			class: `${baseClasses} ${typeClasses[type]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
			onclick: disabled ? () => {} : onclick,
			disabled
		};
	}
</script>

<div class="px-2 py-6 sm:px-4 lg:px-6 xl:px-8 2xl:px-12">
	<div class="border-4 border-dashed border-blue-200 rounded-lg p-4 sm:p-6 lg:p-8">
		<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
			<h2 class="text-2xl lg:text-3xl font-bold text-blue-800 mb-4 lg:mb-0">📁 Dokumenty</h2>
			<div class="text-sm text-blue-600">
				Faktury, zamówienia, dokumentacja sprzętu
			</div>
		</div>

			<!-- Obszar przesyłania -->
			<div class="bg-white p-4 lg:p-6 rounded-lg shadow-sm mb-6">
				<h3 class="text-lg font-semibold text-blue-800 mb-4">📤 Prześlij dokumenty</h3>
				
				<!-- Wybór kategorii -->
				<div class="mb-4">
					<label for="category-select" class="block text-sm font-medium text-blue-700 mb-2">
						Wybierz firmę:
					</label>
					<select 
						id="category-select"
						bind:value={selectedCategoryId}
						class="w-full max-w-xs border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
				</div>
				
				<!-- Obszar przeciągania i upuszczania -->
				<div 
					class="border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200"
					class:border-blue-300={!dragOver}
					class:bg-blue-50={!dragOver}
					class:border-blue-500={dragOver}
					class:bg-blue-100={dragOver}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					role="button"
					tabindex="0"
					aria-label="Przeciągnij pliki tutaj lub kliknij aby wybrać"
				>
					{#if isUploading}
						<div class="flex flex-col items-center">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
							<p class="text-blue-600">Przesyłanie plików...</p>
						</div>
					{:else}
						<div class="flex flex-col items-center">
							<div class="text-4xl mb-3">📁</div>
							<p class="text-lg font-medium text-blue-900 mb-2">
								Przeciągnij pliki tutaj lub kliknij aby wybrać
							</p>
							<p class="text-sm text-blue-600 mb-4">
								Obsługiwane formaty: {APP_CONFIG.fileTypes.extensions.join(', ')} (max {APP_CONFIG.upload.maxFileSizeLabel})
							</p>
							<input
								type="file"
								multiple
								accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
								onchange={handleFileUpload}
								class="hidden"
								id="file-input"
							/>
							<label
								for="file-input"
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors duration-150"
							>
								Wybierz pliki
							</label>
						</div>
					{/if}
				</div>
				
				{#if uploadMessage}
					{@const classes = getMessageClasses(uploadMessage)}
					<div class={classes.container}>
						<p class={classes.text}>
							{uploadMessage}
						</p>
					</div>
				{/if}
			</div>

		<!-- Zarządzanie kategoriami -->
		<div class="bg-white p-4 lg:p-6 rounded-lg shadow-sm mb-6">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
				<h3 class="text-lg font-semibold text-blue-800 mb-2 sm:mb-0">🏢 Zarządzanie firmami</h3>
				<div class="flex flex-col sm:flex-row gap-2">
					<button
						onclick={() => exportDocuments()}
						disabled={isExporting || documents.length === 0}
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-150 text-sm"
					>
						{#if isExporting}
							📦 Eksportowanie...
						{:else}
							📦 Eksportuj wszystkie
						{/if}
					</button>
					<button
						onclick={() => openCategoryModal('add')}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150 text-sm"
					>
						➕ Dodaj firmę
					</button>
				</div>
			</div>
			
			{#if categories.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<!-- Specjalna kafelka "Wszystkie" -->
					<div 
						class="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
						class:bg-blue-100={filteredCategoryId === null}
						class:border-blue-400={filteredCategoryId === null}
						onclick={() => filterByCategory(null)}
						onkeydown={(e) => e.key === 'Enter' && filterByCategory(null)}
						role="button"
						tabindex="0"
						aria-label="Pokaż wszystkie dokumenty"
					>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h4 class="font-medium text-blue-900">📋 Wszystkie</h4>
								<p class="text-sm text-blue-600 mt-1">Pokaż dokumenty ze wszystkich firm</p>
								<p class="text-xs text-blue-700 mt-2 font-medium">
									Dokumentów: {documents.length}
								</p>
							</div>
							<div class="flex flex-col space-y-1 ml-2">
								<button
									onclick={(e) => {
										e.stopPropagation();
										exportDocuments();
									}}
									disabled={isExporting || documents.length === 0}
									class="p-1 text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150 text-lg cursor-pointer"
									title="Eksportuj wszystkie dokumenty"
								>
									📦
								</button>
							</div>
						</div>
					</div>
					
					{#each categories as category}
						<div 
							class="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
							class:bg-blue-100={filteredCategoryId === category.id}
							class:border-blue-400={filteredCategoryId === category.id}
							onclick={() => filterByCategory(category.id)}
							onkeydown={(e) => e.key === 'Enter' && filterByCategory(category.id)}
							role="button"
							tabindex="0"
							aria-label={`Filtruj dokumenty dla firmy ${category.name}`}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<h4 class="font-medium text-blue-900">{category.name}</h4>
									{#if category.description}
										<p class="text-sm text-blue-600 mt-1">{category.description}</p>
									{/if}
									<p class="text-xs text-blue-500 mt-2">
										Utworzona: {new Date(category.createdDate).toLocaleDateString('pl-PL')}
									</p>								<p class="text-xs text-blue-700 mt-1 font-medium">
									Dokumentów: {getDocumentCountForCategory(category.id)}
								</p>
								</div>
								<div class="flex flex-col space-y-1 ml-2">
									<div class="flex space-x-1">									<button
										onclick={(e) => {
											e.stopPropagation();
											openCategoryModal('edit', category);
										}}
										class="p-1 text-blue-600 hover:text-blue-800 transition-colors duration-150 cursor-pointer text-lg"
										title="Edytuj firmę"
									>
										✏️
									</button>
										{#if category.name !== 'Ogólne'}
											<button
												onclick={(e) => {
													e.stopPropagation();
													deleteCategory(category);
												}}
												class="p-1 text-red-600 hover:text-red-800 transition-colors duration-150 cursor-pointer text-lg"
												title="Usuń firmę"
											>
												🗑️
											</button>
										{/if}
									</div>
									<button
										onclick={(e) => {
											e.stopPropagation();
											exportDocuments(category.id);
										}}
										disabled={isExporting || getDocumentCountForCategory(category.id) === 0}
										class="p-1 text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150 text-lg cursor-pointer"
										title="Eksportuj dokumenty tej firmy"
									>
										📦
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8">
					<div class="text-blue-400 text-4xl mb-2">🏢</div>
					<p class="text-blue-600">Brak firm. Dodaj pierwszą firmę aby zorganizować dokumenty.</p>
				</div>
			{/if}
		</div>

		<!-- Lista dokumentów -->
		<div class="bg-white shadow-sm rounded-lg overflow-hidden">
			<div class="px-2 py-5 sm:px-4 lg:px-6">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
					<h3 class="text-lg leading-6 font-medium text-blue-900 mb-2 sm:mb-0">
						Lista dokumentów - {currentCategoryName} ({filteredDocuments.length} plików)
					</h3>
					{#if filteredCategoryId}
						<button
							onclick={clearFilter}
							class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-150"
						>
							❌ Wyczyść filtr
						</button>
					{/if}
				</div>

				{#if isLoading}
					<div class="flex justify-center items-center py-12">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
						<span class="ml-3 text-blue-600">Ładowanie dokumentów...</span>
					</div>
				{:else if filteredDocuments.length > 0}
					<div class="w-full overflow-x-auto">
						<table class="min-w-full divide-y divide-blue-200">
							<thead class="bg-blue-50">
								<tr>
									<th class="px-3 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider">
										Dokument
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider">
										Firma
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider">
										Rozmiar
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider">
										Data przesłania
									</th>
									<th class="px-3 py-3 text-left text-xs font-medium text-blue-500 uppercase tracking-wider">
										Akcje
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-blue-200">
								{#each filteredDocuments as document}
									<tr class="hover:bg-blue-50 transition-colors duration-150">
										<td class="px-3 py-4">
											<div class="flex items-center">
												<span class="text-2xl mr-3">{getFileIcon(document.name)}</span>
												<div>
													<div class="text-sm font-medium text-blue-900">{document.name}</div>
													{#if document.description}
														<div class="text-xs text-blue-600">{document.description}</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-3 py-4 text-sm text-blue-500">
											<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												🏢 {getCategoryName(document.categoryId)}
											</span>
										</td>
										<td class="px-3 py-4 text-sm text-blue-500">
											{formatFileSize(document.size)}
										</td>
										<td class="px-3 py-4 text-sm text-blue-500">
											{new Date(document.uploadDate).toLocaleDateString('pl-PL')}
										</td>
										<td class="px-3 py-4">
											<div class="flex space-x-2">
												<a
													href="/api/documents/{document.id}/download"
													download
													class="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-150"
													title="Pobierz dokument"
												>
													⬇️ Pobierz
												</a>
												<button
													onclick={() => deleteDocument(document.id)}
													class="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-150"
													title="Usuń dokument"
												>
													🗑️ Usuń
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-center py-12">
						<div class="text-blue-400 text-6xl mb-4">📁</div>					<h3 class="text-lg font-medium text-blue-900 mb-2">
						{#if filteredCategoryId}
							Brak dokumentów dla firmy {currentCategoryName}
						{:else}
							Brak dokumentów
						{/if}
					</h3>
						<p class="text-blue-600">
							{#if filteredCategoryId}
								Ta firma nie ma jeszcze żadnych dokumentów.
							{:else}
								Prześlij pierwsze dokumenty aby je tutaj zobaczyć.
							{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal potwierdzenia usunięcia -->
{#if showDeleteModal && documentToDelete}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		onclick={closeDeleteModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-modal-title"
		onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}
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
				<div class="text-3xl mr-3">{APP_CONFIG.modals.deleteDocument.icon}</div>
				<h3 id="delete-modal-title" class="text-lg font-semibold text-gray-900">{APP_CONFIG.modals.deleteDocument.title}</h3>
			</div>
			
			<div class="mb-6">
				<p class="text-gray-700 mb-2">
					Czy na pewno chcesz usunąć dokument:
				</p>
				<div class="bg-gray-50 p-3 rounded-md border">
					<div class="flex items-center">
						<span class="text-2xl mr-2">{getFileIcon(documentToDelete.name)}</span>
						<div>
							<div class="font-medium text-gray-900">{documentToDelete.name}</div>
							<div class="text-sm text-gray-500">
								{formatFileSize(documentToDelete.size)} • 
								{new Date(documentToDelete.uploadDate).toLocaleDateString('pl-PL')}
							</div>
						</div>
					</div>
				</div>
				<p class="text-red-600 text-sm mt-2">
					⚠️ Ta operacja jest nieodwracalna!
				</p>
			</div>
			
			<div class="flex space-x-3 justify-end">
				<button
					onclick={closeDeleteModal}
					class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-150 font-medium"
				>
					Anuluj
				</button>
				<button
					onclick={confirmDelete}
					class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-150 font-medium"
				>
					Usuń dokument
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal zarządzania kategoriami -->
{#if showCategoryModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		onclick={closeCategoryModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="category-modal-title"
		onkeydown={(e) => e.key === 'Escape' && closeCategoryModal()}
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
				<div class="text-3xl mr-3">{APP_CONFIG.modals.category[categoryModalMode].icon}</div>
				<h3 id="category-modal-title" class="text-lg font-semibold text-gray-900">
					{APP_CONFIG.modals.category[categoryModalMode].title}
				</h3>
			</div>
			
			<div class="mb-4">
				<label for="category-name" class="block text-sm font-medium text-gray-700 mb-2">
					Nazwa firmy *
				</label>
				<input
					id="category-name"
					type="text"
					bind:value={newCategoryName}
					placeholder="np. Komputronik, x-kom, morele..."
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					maxlength="100"
					onclick={(e) => e.stopPropagation()}
				/>
			</div>
			
			<div class="mb-6">
				<label for="category-description" class="block text-sm font-medium text-gray-700 mb-2">
					Opis (opcjonalny)
				</label>
				<textarea
					id="category-description"
					bind:value={newCategoryDescription}
					placeholder="Dodatkowe informacje o firmie..."
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					rows="3"
					maxlength="300"
					onclick={(e) => e.stopPropagation()}
				></textarea>
			</div>
			
			<div class="flex space-x-3 justify-end">
				<button
					onclick={closeCategoryModal}
					class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-150 font-medium"
				>
					Anuluj
				</button>
				<button
					onclick={saveCategory}
					class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-150 font-medium"
				>
					{APP_CONFIG.modals.category[categoryModalMode].action}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal potwierdzenia usunięcia kategorii -->
{#if showDeleteCategoryModal && categoryToDelete}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		onclick={closeDeleteCategoryModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-category-modal-title"
		onkeydown={(e) => e.key === 'Escape' && closeDeleteCategoryModal()}
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
				<div class="text-3xl mr-3">{APP_CONFIG.modals.deleteCategory.icon}</div>
				<h3 id="delete-category-modal-title" class="text-lg font-semibold text-gray-900">{APP_CONFIG.modals.deleteCategory.title}</h3>
			</div>
			
			<div class="mb-6">
				<p class="text-gray-700 mb-2">
					Czy na pewno chcesz usunąć firmę:
				</p>
				<div class="bg-gray-50 p-3 rounded-md border">
					<div class="flex items-center">
						<span class="text-2xl mr-2">🏢</span>
						<div>
							<div class="font-medium text-gray-900">{categoryToDelete.name}</div>
							{#if categoryToDelete.description}
								<div class="text-sm text-gray-500">{categoryToDelete.description}</div>
							{/if}
						</div>
					</div>
				</div>
				<p class="text-red-600 text-sm mt-2">
					⚠️ Ta operacja jest nieodwracalna! Wszystkie dokumenty przypisane do tej firmy zostaną przeniesione do kategorii "{APP_CONFIG.defaultCategory.name}".
				</p>
			</div>
			
			<div class="flex space-x-3 justify-end">
				<button
					onclick={closeDeleteCategoryModal}
					class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors duration-150 font-medium"
				>
					Anuluj
				</button>
				<button
					onclick={confirmDeleteCategory}
					class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors duration-150 font-medium"
				>
					Usuń firmę
				</button>
			</div>
		</div>
	</div>
{/if}
