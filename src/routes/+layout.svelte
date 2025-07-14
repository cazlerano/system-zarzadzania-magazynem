<script>
	import '../app.css';
	import { page } from '$app/stores';
	
	let { children } = $props();
	let mobileMenuOpen = $state(false);
	
	// Konfiguracja elementów nawigacji
	const navItems = [
		{ href: '/', label: 'Przegląd', icon: '👤' },
		{ href: '/magazyn', label: 'Magazyn', icon: '📋' },
		{ href: '/import', label: 'Import', icon: '📥' },
		{ href: '/dokumenty', label: 'Dokumenty', icon: '📁' },
		{ href: '/o-projekcie', label: 'O Projekcie', icon: 'ℹ️' },
		{ href: '/admin', label: 'Admin', icon: '⚙️' }
	];
	
	// Stan pochodny dla aktualnej ścieżki
	let currentPath = $derived($page.url.pathname);
	
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	/**
	 * Sprawdź czy dana ścieżka jest aktywna
	 * @param {string} href
	 */
	function isActivePath(href) {
		return currentPath === href;
	}
	
	/**
	 * Pobierz klasy linków nawigacji desktopowej
	 * @param {string} href
	 */
	function getDesktopLinkClasses(href) {
		const baseClasses = "border-transparent text-green-100 hover:border-green-200 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-base font-medium transition-colors duration-200";
		const activeClasses = isActivePath(href) ? "border-green-200 text-white" : "";
		return `${baseClasses} ${activeClasses}`.trim();
	}
	
	/**
	 * Pobierz klasy linków nawigacji mobilnej
	 * @param {string} href
	 */
	function getMobileLinkClasses(href) {
		const baseClasses = "block pl-3 pr-4 py-2 border-l-4 text-lg font-medium transition-colors duration-200";
		const isActive = isActivePath(href);
		
		if (isActive) {
			return `${baseClasses} border-green-400 text-white bg-green-700`;
		} else {
			return `${baseClasses} border-transparent text-green-100 hover:text-white hover:bg-green-500 hover:border-green-300`;
		}
	}
</script>

<div class="min-h-screen bg-green-50">
	<nav class="bg-green-600 shadow-lg sticky top-0 z-40">
		<div class="max-w-full mx-auto px-4 lg:px-6 xl:px-8">
			<div class="flex justify-between h-16">
				<div class="flex">			<div class="flex-shrink-0 flex items-center">
				<div>
					<h1 class="text-xl font-bold text-white">📦 Zarządzanie Magazynem IT</h1>
					<p class="text-xs text-green-200">v. beta 0.8.2 <a href="https://github.com/cazlerano" target="_blank" rel="noopener noreferrer" class="text-green-100 hover:text-white underline transition-colors duration-200">@cazlerano</a> | ⚠️ Współdzielony dostęp</p>
				</div>
			</div>
					<div class="hidden sm:ml-6 sm:flex sm:space-x-8">
						{#each navItems as item}
							<a
								href={item.href}
								class={getDesktopLinkClasses(item.href)}
							>
								{item.icon} {item.label}
							</a>
						{/each}
					</div>
				</div>
				
				<!-- Przycisk menu mobilnego -->
				<div class="sm:hidden flex items-center">
					<button
						type="button"
						class="text-green-100 hover:text-white focus:outline-none focus:text-white transition duration-150 ease-in-out"
						onclick={toggleMobileMenu}
						aria-label="Otwórz menu mobilne"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
						</svg>
					</button>
				</div>
			</div>
		</div>
		
		<!-- Menu mobilne -->
		<div class="sm:hidden" class:hidden={!mobileMenuOpen}>
			<div class="pt-2 pb-3 space-y-1">
				{#each navItems as item}
					<a
						href={item.href}
						class={getMobileLinkClasses(item.href)}
					>
						{item.icon} {item.label}
					</a>
				{/each}
			</div>
		</div>
	</nav>

	<main class="max-w-full mx-auto">
		{@render children()}
	</main>
</div>
