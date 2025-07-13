<script>
	// Konfiguracja strony "O Projekcie"
	const PROJECT_INFO = {
		title: "System Zarządzania Magazynem IT",
		version: "0.8.2 Beta",
		author: "@cazlerano",
		github: "https://github.com/cazlerano",
		description: "Aplikacja webowa do zarządzania sprzętem IT",
		
		// Główne powody powstania projektu
		motivation: {
			title: "Dlaczego powstał ten projekt?",
			reasons: [
				{
					icon: "📊",
					title: "Koniec z Excelami",
					description: "Głównym celem było zastąpienie chaotycznych arkuszy Excel jednym, centralnym systemem zarządzania sprzętem IT."
				},
				{
					icon: "🔍",
					title: "Łatwe wyszukiwanie",
					description: "Natychmiastowe wyszukiwanie sprzętu, użytkowników i historii przypisań bez przeszukiwania kilkunastu plików."
				},
				{
					icon: "📱",
					title: "Dostęp z każdego urządzenia",
					description: "Responsywny interfejs umożliwiający zarządzanie magazynem z komputera lub telefonu."
				},
				{
					icon: "👥",
					title: "Współdzielony dostęp",
					description: "Możliwość jednoczesnej pracy kilku osób bez konfliktów wersji i nadpisywania danych."
				},
				{
					icon: "📈",
					title: "Historia i statystyki",
					description: "Automatyczne śledzenie zmian, historii przypisań oraz generowanie przydatnych statystyk."
				},
				{
					icon: "⚡",
					title: "Szybkość i wydajność",
					description: "Natychmiastowe ładowanie danych i operacje bez konieczności otwierania ciężkich plików Excel."
				}
			]
		},
		
		// Funkcjonalności aplikacji
		features: {
			title: "Główne funkcjonalności",
			list: [
				{
					icon: "👥",
					title: "Zarządzanie użytkownikami",
					description: "Dodawanie, edytowanie i usuwanie użytkowników systemu"
				},
				{
					icon: "📦",
					title: "Inwentaryzacja sprzętu",
					description: "Kompletna baza sprzętu z numerami seryjnymi, CLN, inwentarzowymi i statusem"
				},
				{
					icon: "🔗",
					title: "Przypisywanie sprzętu",
					description: "Łatwe przypisywanie i odłączanie sprzętu od użytkowników"
				},
				{
					icon: "📊",
					title: "Historia i raporty",
					description: "Pełna historia zmian i możliwość eksportu danych do CSV"
				},
				{
					icon: "📄",
					title: "Zarządzanie dokumentami",
					description: "Przechowywanie i zarządzanie dokumentami związanymi ze sprzętem"
				},
				{
					icon: "📥",
					title: "Import/Export",
					description: "Masowy import sprzętu z CSV oraz eksport danych"
				},
				{
					icon: "🔧",
					title: "Status uszkodzeń",
					description: "Oznaczanie i śledzenie sprzętu uszkodzonego"
				},
				{
					icon: "🔐",
					title: "Różne typy sprzętu",
					description: "Obsługa komputerów, monitorów, drukarek, YubiKey i innych urządzeń"
				}
			]
		},
		
		// Technologie użyte w projekcie
		technologies: {
			title: "Technologie",
			frontend: [
				{ name: "SvelteKit 5", description: "Nowoczesny framework frontendowy" },
				{ name: "Svelte 5 Runes", description: "Najnowszy system reaktywności" },
				{ name: "Tailwind CSS", description: "Utility-first CSS framework" },
				{ name: "TypeScript", description: "Typowanie statyczne dla JavaScript" }
			],
			backend: [
				{ name: "Node.js", description: "Środowisko uruchomieniowe JavaScript" },
				{ name: "JSON Files", description: "Proste przechowywanie danych" },
				{ name: "File System API", description: "Zarządzanie plikami i dokumentami" }
			]
		},
		
		// Statystyki projektu
		stats: {
			title: "Statystyki projektu",
			items: [
				{ label: "Linie kodu", value: "2000+", icon: "💻" },
				{ label: "Komponenty Svelte", value: "15+", icon: "🧩" },
				{ label: "Strony aplikacji", value: "6", icon: "📄" },
				{ label: "Obsługiwane typy sprzętu", value: "8", icon: "📦" }
			]
		}
	};
</script>

<div class="px-4 py-6 sm:px-0">
	<div class="max-w-6xl mx-auto">
		<div class="border-4 border-dashed border-blue-200 rounded-lg p-6">
			<!-- Header -->
			<div class="text-center mb-12">
				<h1 class="text-3xl font-bold text-blue-800 mb-4">ℹ️ O Projekcie</h1>
				<div class="max-w-3xl mx-auto">
					<h2 class="text-2xl font-semibold text-blue-700 mb-3">{PROJECT_INFO.title}</h2>
					<p class="text-blue-600 text-lg mb-4">{PROJECT_INFO.description}</p>
					<div class="flex items-center justify-center space-x-6 text-sm text-gray-600">
						<span class="bg-blue-100 px-3 py-1 rounded-full">
							📦 Wersja {PROJECT_INFO.version}
						</span>
						<a 
							href={PROJECT_INFO.github} 
							target="_blank" 
							rel="noopener noreferrer"
							class="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
						>
							👨‍💻 {PROJECT_INFO.author}
						</a>
					</div>
				</div>
			</div>

			<!-- Motivation Section -->
			<section class="mb-12">
				<h3 class="text-2xl font-bold text-blue-800 mb-8 text-center">{PROJECT_INFO.motivation.title}</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each PROJECT_INFO.motivation.reasons as reason}
						<div class="bg-white rounded-lg shadow-sm border border-blue-200 p-6 hover:shadow-md transition-shadow">
							<div class="text-3xl mb-4">{reason.icon}</div>
							<h4 class="text-lg font-semibold text-blue-800 mb-3">{reason.title}</h4>
							<p class="text-gray-600 text-sm leading-relaxed">{reason.description}</p>
						</div>
					{/each}
				</div>
			</section>

			<!-- Features Section -->
			<section class="mb-12">
				<h3 class="text-2xl font-bold text-blue-800 mb-8 text-center">{PROJECT_INFO.features.title}</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{#each PROJECT_INFO.features.list as feature}
						<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4 hover:from-blue-100 hover:to-indigo-100 transition-all">
							<div class="text-2xl mb-3">{feature.icon}</div>
							<h4 class="text-sm font-semibold text-blue-800 mb-2">{feature.title}</h4>
							<p class="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
						</div>
					{/each}
				</div>
			</section>

			<!-- Technologies Section -->
			<section class="mb-12">
				<h3 class="text-2xl font-bold text-blue-800 mb-8 text-center">{PROJECT_INFO.technologies.title}</h3>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<!-- Frontend -->
					<div class="bg-white rounded-lg shadow-sm border border-green-200 p-6">
						<h4 class="text-xl font-semibold text-green-800 mb-4 flex items-center">
							🎨 Frontend
						</h4>
						<div class="space-y-3">
							{#each PROJECT_INFO.technologies.frontend as tech}
								<div class="flex items-start space-x-3">
									<div class="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
									<div>
										<div class="font-medium text-green-700">{tech.name}</div>
										<div class="text-sm text-gray-600">{tech.description}</div>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Backend -->
					<div class="bg-white rounded-lg shadow-sm border border-purple-200 p-6">
						<h4 class="text-xl font-semibold text-purple-800 mb-4 flex items-center">
							⚙️ Backend
						</h4>
						<div class="space-y-3">
							{#each PROJECT_INFO.technologies.backend as tech}
								<div class="flex items-start space-x-3">
									<div class="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
									<div>
										<div class="font-medium text-purple-700">{tech.name}</div>
										<div class="text-sm text-gray-600">{tech.description}</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</section>

			<!-- Stats Section -->
			<section class="mb-12">
				<h3 class="text-2xl font-bold text-blue-800 mb-8 text-center">{PROJECT_INFO.stats.title}</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each PROJECT_INFO.stats.items as stat}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
							<div class="text-2xl mb-2">{stat.icon}</div>
							<div class="text-2xl font-bold text-blue-800 mb-1">{stat.value}</div>
							<div class="text-sm text-gray-600">{stat.label}</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Benefits Section -->
			<section class="mb-8">
				<div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-8">
					<h3 class="text-2xl font-bold text-green-800 mb-6 text-center">
						✨ Korzyści z używania systemu
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-4">
							<h4 class="text-lg font-semibold text-green-700">🚀 Dla administratorów IT:</h4>
							<ul class="space-y-2 text-sm text-gray-700">
								<li class="flex items-start space-x-2">
									<span class="text-green-500 mt-1">•</span>
									<span>Natychmiastowy dostęp do informacji o sprzęcie</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-green-500 mt-1">•</span>
									<span>Automatyczne śledzenie historii przypisań</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-green-500 mt-1">•</span>
									<span>Łatwe generowanie raportów i statystyk</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-green-500 mt-1">•</span>
									<span>Kontrola nad statusem sprzętu (uszkodzenia)</span>
								</li>
							</ul>
						</div>
						<div class="space-y-4">
							<h4 class="text-lg font-semibold text-blue-700">👥 Dla zespołu:</h4>
							<ul class="space-y-2 text-sm text-gray-700">
								<li class="flex items-start space-x-2">
									<span class="text-blue-500 mt-1">•</span>
									<span>Koniec z szukaniem informacji w różnych plikach</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-blue-500 mt-1">•</span>
									<span>Współdzielony dostęp bez konfliktów wersji</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-blue-500 mt-1">•</span>
									<span>Intuicyjny interfejs wymagający minimalnego szkolenia</span>
								</li>
								<li class="flex items-start space-x-2">
									<span class="text-blue-500 mt-1">•</span>
									<span>Dostęp z każdego urządzenia z przeglądarką</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			<!-- Footer -->
			<div class="text-center text-sm text-gray-500 border-t pt-6">
				<p>
					🔧 Aplikacja jest w ciągłym rozwoju - sugestie i uwagi są mile widziane!
				</p>
			</div>
		</div>
	</div>
</div>
