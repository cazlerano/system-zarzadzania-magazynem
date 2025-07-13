<script>
	import { getUsers, getEquipment, getEquipmentByUserId, deleteUser, formatCount } from '$lib/data.js';
	import EquipmentManagementModal from '$lib/EquipmentManagementModal.svelte';
	import EquipmentHistoryModal from '$lib/EquipmentHistoryModal.svelte';
	import UserEditModal from '$lib/UserEditModal.svelte';
	import UserHistoryModal from '$lib/UserHistoryModal.svelte';
	
	// State management with Svelte 5 runes
	let selectedUserId = $state(/** @type {number | null} */ (null));
	let userEquipment = $state(/** @type {Array<any>} */ ([]));
	let selectedUserObject = $state(/** @type {any} */ (null));
	
	// Modal state
	let isManagementModalOpen = $state(false);
	let isHistoryModalOpen = $state(false);
	let isUserEditModalOpen = $state(false);
	let isUserHistoryModalOpen = $state(false);
	let selectedEquipmentForHistory = $state(/** @type {any} */ (null));
	let selectedUserForEdit = $state(/** @type {any} */ (null));
	
	// Search and data state
	let searchQuery = $state('');
	let users = $state(/** @type {Array<any>} */ ([]));
	let allEquipment = $state(/** @type {Array<any>} */ ([]));
	let userEquipmentCounts = $state(/** @type {Map<number, number>} */ (new Map()));
	let isLoading = $state(true);
	
	// Derived state using Svelte 5 $derived
	let filteredUsers = $derived.by(() => {
		if (!searchQuery.trim()) return users;
		
		const query = searchQuery.toLowerCase().trim();
		return users.filter(user => {
			const fullName = user.name.toLowerCase();
			const email = user.email.toLowerCase();
			return fullName.includes(query) || email.includes(query);
		});
	});
	
	let searchResultsInfo = $derived.by(() => {
		if (!searchQuery) return null;
		if (filteredUsers.length === 0) return `Brak wyników dla "${searchQuery}"`;
		
		return `Znaleziono ${formatCount(filteredUsers.length, 'user')}`;
	});
	
	let currentUser = $derived.by(() => 
		selectedUserId ? users.find(u => u.id === selectedUserId) : null
	);
	
	// Equipment statistics derived states
	let totalEquipmentCount = $derived.by(() => allEquipment.length);
	
	let assignedEquipmentCount = $derived.by(() => 
		allEquipment.filter(item => 
			Boolean(item.assignedUser || ((item.type === 'Monitor' || item.type === 'Drukarka') && item.roomLocation))
		).length
	);
	
	let availableEquipmentCount = $derived.by(() => 
		allEquipment.filter(item => 
			!Boolean(item.assignedUser || ((item.type === 'Monitor' || item.type === 'Drukarka') && item.roomLocation))
		).length
	);
	
	let damagedEquipmentCount = $derived.by(() => 
		allEquipment.filter(item => item.damaged).length
	);
	
	// Load data on mount
	$effect(() => {
		loadUsersAndEquipment();
	});
	
	// Update equipment counts when users change
	$effect(() => {
		if (users.length > 0) {
			updateEquipmentCounts();
		}
	});
	
	
	// Utility functions
	/**
	 * Get user initials for avatar
	 * @param {string} name
	 */
	const getUserInitials = (name) => {
		const parts = name.split(' ');
		return parts.length > 1 
			? name.charAt(0) + parts[1]?.charAt(0) || '' 
			: name.charAt(0);
	};
	
	/**
	 * Get equipment type emoji
	 * @param {string} type
	 */
	const getEquipmentEmoji = (type) => {
		const emojiMap = {
			'Komputer': '💻',
			'Drukarka': '🖨️',
			'Monitor': '🖥️',
			'Myszka': '🖱️',
			'Zasilacz': '🔌',
			'Klawiatura': '⌨️',
			'Stacja dokująca': '🔗',
			'YubiKey': '🔐'
		};
		return emojiMap[/** @type {keyof typeof emojiMap} */ (type)] || '📦';
	};
	
	/**
	 * Format equipment count text
	 * @param {number} count
	 */
	const formatEquipmentCount = (count) => {
		return formatCount(count, 'item');
	};
	
	/**
	 * Handle keyboard events for interactive elements
	 * @param {KeyboardEvent} event
	 * @param {Function} callback
	 */
	const handleKeyDown = (event, callback) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			callback();
		}
	};

	// Data loading functions
	async function loadUsersAndEquipment() {
		try {
			isLoading = true;
			const [usersData, equipmentData] = await Promise.all([
				getUsers(),
				getEquipment()
			]);
			users = usersData;
			allEquipment = equipmentData;
		} catch (error) {
			console.error('Error loading data:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function loadUsers() {
		try {
			isLoading = true;
			users = await getUsers();
		} catch (error) {
			console.error('Error loading users:', error);
		} finally {
			isLoading = false;
		}
	}
	
	async function updateEquipmentCounts() {
		const counts = new Map();
		// Use Promise.all for better performance
		const equipmentPromises = users.map(async (user) => {
			const equipment = await getEquipmentByUserId(user.id);
			return { userId: user.id, count: equipment.length };
		});
		
		const results = await Promise.all(equipmentPromises);
		results.forEach(({ userId, count }) => counts.set(userId, count));
		userEquipmentCounts = counts;
	}
	
	// User selection and navigation
	/**
	 * @param {any} user
	 */
	async function selectUser(user) {
		selectedUserId = user.id;
		selectedUserObject = user;
		userEquipment = await getEquipmentByUserId(user.id);
		// Add equipment to user object for modal
		selectedUserObject.equipment = userEquipment;
	}
	
	function backToUsersList() {
		selectedUserId = null;
		selectedUserObject = null;
		userEquipment = [];
	}
	
	// Modal handlers
	function openManagementModal() {
		isManagementModalOpen = true;
	}
	
	function openUserHistoryModal() {
		isUserHistoryModalOpen = true;
	}
	
	/**
	 * @param {any} equipment
	 */
	function showEquipmentHistory(equipment) {
		selectedEquipmentForHistory = equipment;
		isHistoryModalOpen = true;
	}
	
	/**
	 * @param {MouseEvent} event
	 * @param {any} user
	 */
	function handleEditUser(event, user) {
		event.stopPropagation();
		selectedUserForEdit = user;
		isUserEditModalOpen = true;
	}
	
	// Update handlers with optimized refresh logic
	function handleUserUpdate() {
		loadUsersAndEquipment();
		
		// Refresh current user data if needed
		if (selectedUserId && selectedUserForEdit?.id === selectedUserId) {
			selectUser(selectedUserForEdit);
		}
	}
	
	function handleEquipmentUpdate() {
		loadUsersAndEquipment();
		
		// Refresh current user data if needed
		if (currentUser) {
			selectUser(currentUser);
		}
	}
	
	// Search functionality
	function clearSearch() {
		searchQuery = '';
	}
</script>

<div class="px-4 py-6 sm:px-0">
	<div class="max-w-7xl mx-auto">
		{#if !selectedUserId}
			<!-- Ogólne statystyki sprzętu -->
			{#if !isLoading}
				<div class="mb-8">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div class="bg-green-100 p-4 rounded-lg">
							<div class="flex items-center">
								<div class="text-2xl">📦</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-green-600">Łącznie sprzętu</p>
									<p class="text-2xl font-bold text-green-900">{formatCount(totalEquipmentCount, 'equipment')}</p>
								</div>
							</div>
						</div>
						
						<div class="bg-blue-100 p-4 rounded-lg">
							<div class="flex items-center">
								<div class="text-2xl">✅</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-blue-600">Przypisane</p>
									<p class="text-2xl font-bold text-blue-900">{formatCount(assignedEquipmentCount, 'equipment')}</p>
								</div>
							</div>
						</div>
						
						<div class="bg-orange-100 p-4 rounded-lg">
							<div class="flex items-center">
								<div class="text-2xl">⏳</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-orange-600">Magazyn IT</p>
									<p class="text-2xl font-bold text-orange-900">{formatCount(availableEquipmentCount, 'equipment')}</p>
								</div>
							</div>
						</div>
						
						<div class="bg-red-100 p-4 rounded-lg">
							<div class="flex items-center">
								<div class="text-2xl">⚠️</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-red-600">Uszkodzone</p>
									<p class="text-2xl font-bold text-red-900">{formatCount(damagedEquipmentCount, 'equipment')}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Lista użytkowników -->
			<div class="border-4 border-dashed border-green-200 rounded-lg p-4">
				<div class="bg-white shadow rounded-lg">
					<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-2xl font-bold text-green-800 mb-6">👥 Wszyscy Użytkownicy</h2>
					<p class="text-green-600 mb-6">Kliknij na użytkownika, aby zobaczyć przypisany do niego sprzęt</p>
					
					<!-- Search -->
					<div class="flex items-center space-x-4">
						<div class="flex-1 relative max-w-2xl">
							<input
								type="text"
								placeholder="Szukaj użytkownika..."
								class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
								bind:value={searchQuery}
							/>
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
								</svg>
							</div>
							{#if searchQuery}
								<button
									onclick={clearSearch}
									class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
									aria-label="Wyczyść wyszukiwanie"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
									</svg>
								</button>
							{/if}
						</div>
						<button
							onclick={loadUsers}
							class="px-3 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200 cursor-pointer whitespace-nowrap"
						>
							🔄 Odśwież listę
						</button>
					</div>
							<!-- Search Results Info -->
				{#if searchResultsInfo}
					<p class="text-gray-500 text-sm mt-2">{searchResultsInfo}</p>
				{/if}
				</div>
				
				{#if isLoading}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
						<span class="ml-3 text-green-600">Ładowanie użytkowników...</span>
					</div>
				{:else}
					<div class="px-6 pt-4">
						<h3 class="text-lg leading-6 font-medium text-green-900 mb-4">
							Lista użytkowników ({formatCount(filteredUsers.length, 'user')})
							<span class="text-sm font-normal text-green-600 block mt-1">
								Kliknij na wiersz, aby zobaczyć szczegóły
							</span>
						</h3>
					</div>
					
					{#if filteredUsers.length > 0}
						<div class="px-6 pb-6">
							<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-green-200">
								<thead class="bg-green-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
											Użytkownik
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
											Email
										</th>
										<th class="px-6 py-3 text-center text-xs font-medium text-green-500 uppercase tracking-wider">
											Przypisany sprzęt
										</th>
										<th class="px-6 py-3 text-center text-xs font-medium text-green-500 uppercase tracking-wider">
											Akcje
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-green-200">
									{#each filteredUsers as user (user.id)}
										{@const userEquipmentCount = userEquipmentCounts.get(user.id) || 0}
										{@const userInitials = getUserInitials(user.name)}
										{@const equipmentCountText = formatEquipmentCount(userEquipmentCount)}
										
										<tr 
											class="hover:bg-green-50 cursor-pointer transition-colors duration-150"
											onclick={() => selectUser(user)}
											role="button"
											tabindex="0"
											onkeydown={(e) => handleKeyDown(e, () => selectUser(user))}
										>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center">
													<div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
														<span class="text-white text-sm font-bold">{userInitials}</span>
													</div>
													<div>
														<div class="text-sm font-medium text-green-900">{user.name}</div>
													</div>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-green-600">{user.email}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-center">
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {userEquipmentCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
													{equipmentCountText}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-center">
												<button
													onclick={(event) => handleEditUser(event, user)}
													class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
													title="Edytuj użytkownika"
												>
													✏️ Edytuj
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						</div>
					{:else}
						<div class="px-6 pb-6">
							<div class="text-center py-12">
							<div class="text-green-400 text-6xl mb-4">👥</div>
							<h3 class="text-lg font-medium text-green-900 mb-2">Brak wyników</h3>
							<p class="text-green-600">Nie znaleziono użytkowników spełniających kryteria wyszukiwania.</p>
						</div>
						</div>
					{/if}
				{/if}
				</div>
			</div>
		{:else}
			<!-- Szczegóły użytkownika -->
			<div class="mb-4">
				<button 
					onclick={backToUsersList}
					class="flex items-center text-green-600 hover:text-green-800 transition-colors duration-200"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
					</svg>
					Powrót do listy użytkowników
				</button>
			</div>
			
			<div class="border-4 border-dashed border-green-200 rounded-lg p-4">
				<div class="bg-white shadow rounded-lg p-6">
				<div class="flex items-center mb-6">
					<div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white text-xl font-bold">{getUserInitials(selectedUserObject.name)}</span>
					</div>
					<div class="flex-1">
						<h2 class="text-2xl font-bold text-green-800">{selectedUserObject.name}</h2>
						<p class="text-green-600">{selectedUserObject.email}</p>
					</div>
					<div class="flex space-x-3">
						<button
							type="button"
							onclick={openUserHistoryModal}
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
						>
							<span>📋</span>
							<span>Historia użytkownika</span>
						</button>
						<button
							type="button"
							onclick={openManagementModal}
							class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
						>
							<span>⚙️</span>
							<span>Zarządzaj sprzętem</span>
						</button>
					</div>
				</div>
				
				{#if userEquipment.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium text-green-900 mb-4">
							Przypisany sprzęt ({formatCount(userEquipment.length, 'item')})
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each userEquipment as item}
								{@const equipmentEmoji = getEquipmentEmoji(item.type)}
								<div 
									class="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors duration-150"
									onclick={() => showEquipmentHistory(item)}
									role="button"
									tabindex="0"
									onkeydown={(e) => handleKeyDown(e, () => showEquipmentHistory(item))}
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center">
											<span class="text-2xl mr-3">{equipmentEmoji}</span>
											<div>
												<div class="font-medium text-green-900">{item.name}</div>
												<div class="text-sm text-green-600">{item.type}</div>
											</div>
										</div>
									</div>
									<div class="mt-2 text-xs text-green-500">
										<div>S/N: {item.serialNumber}</div>
										{#if item.clnNumber}
											<div>CLN: {item.clnNumber}</div>
										{/if}
										{#if item.inventoryNumber}
											<div>INV: {item.inventoryNumber}</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<span class="text-yellow-400">⚠️</span>
							</div>
							<div class="ml-3">
								<h3 class="text-sm font-medium text-yellow-800">
									Brak przypisanego sprzętu
								</h3>
								<div class="mt-2 text-sm text-yellow-700">
									<p>Ten użytkownik nie ma obecnie przypisanego żadnego sprzętu. Użyj przycisku "Zarządzaj sprzętem" powyżej, aby przypisać sprzęt.</p>
								</div>
							</div>
						</div>
					</div>
				{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Equipment Management Modal -->
<EquipmentManagementModal 
	bind:isOpen={isManagementModalOpen} 
	selectedUser={selectedUserObject} 
	onUpdate={handleEquipmentUpdate} 
/>

<!-- Equipment History Modal -->
<EquipmentHistoryModal 
	bind:isOpen={isHistoryModalOpen} 
	equipment={selectedEquipmentForHistory} 
/>

<!-- User History Modal -->
<UserHistoryModal 
	bind:isOpen={isUserHistoryModalOpen} 
	selectedUser={selectedUserObject} 
/>

<!-- User Edit Modal -->
<UserEditModal 
	bind:isOpen={isUserEditModalOpen} 
	user={selectedUserForEdit} 
	onUpdate={handleUserUpdate} 
/>
