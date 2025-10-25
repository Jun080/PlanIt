document.addEventListener("DOMContentLoaded", () => {
    const burger = document.getElementById("burger-menu");
    const nav = document.getElementById("main-nav");
    if (burger && nav) {
        burger.addEventListener("click", () => {
            nav.classList.toggle("open");
            burger.classList.toggle("open");
        });
        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                nav.classList.remove("open");
                burger.classList.remove("open");
            });
        });
    }
});

class DestinationChooser {
    constructor() {
        this.destinations = [];
        this.filteredDestinations = [];
        this.currentFilter = "all";
        this.init();
    }

    async init() {
        await this.loadDestinations();
        this.renderDestinations();
    }

    async loadDestinations() {
        try {
            dataManager.enableWikidata();
            const destinations = await dataManager.getAllDestinations();
            const response = await fetch("assets/data/travel-data.json");
            const travelData = await response.json();
            const cityTags = travelData.cityTags;

            const filtered = destinations.filter(
                (dest, index, self) => index === self.findIndex((d) => d.name === dest.name && d.country === dest.country)
            );

            const uniqueDestinations = filtered.map((city) => {
                const cityKey = city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-");
                const tags = cityTags[cityKey] || {
                    historic: false,
                    nightlife: false,
                    riverside: false,
                };
                return {
                    ...city,
                    tags,
                    _tagKey: cityKey,
                };
            });

            this.destinations = uniqueDestinations;
            this.filteredDestinations = uniqueDestinations;
        } catch (error) {
            this.destinations = [];
            this.filteredDestinations = [];
        }
    }

    filterDestinations(type) {
        this.currentFilter = type;

        if (type === "all") {
            this.filteredDestinations = this.destinations;
        } else if (type === "historic") {
            this.filteredDestinations = this.destinations.filter((dest) => dest.tags?.historic === true);
        } else if (type === "nightlife") {
            this.filteredDestinations = this.destinations.filter((dest) => dest.tags?.nightlife === true);
        } else if (type === "riverside") {
            this.filteredDestinations = this.destinations.filter((dest) => dest.tags?.riverside === true);
        } else {
            this.filteredDestinations = [];
        }

        this.renderDestinations();
    }

    addToItinerary(destination) {
        try {
            StorageManager.addDestination(destination);

            const button = document.querySelector(`[data-destination-id="${destination.id}"]`);
            if (button) {
                const originalText = button.textContent;
                button.textContent = "Ajouté !";
                button.classList.add("added");

                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove("added");
                }, 2000);
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout:", error);
        }
    }

    renderDestinations() {
        const container = document.getElementById("destinationsList");
        const loading = document.getElementById("loadingDestinations");

        if (loading) loading.style.display = "none";
        if (!container) return;

        if (this.filteredDestinations.length === 0) {
            container.innerHTML = `
                <div class="no-destinations">
                    <h3>Aucune destination trouvée</h3>
                    <p>Essayez de changer les filtres ou réessayez plus tard.</p>
                </div>
            `;
            return;
        }

        const itinerary = StorageManager.getItinerary();

        container.innerHTML = this.filteredDestinations
            .map((city) => {
                const cityKey = city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-");
                const isInItinerary = itinerary.some((dest) => dest.name.toLowerCase().replace(/\s+/g, "-") === cityKey);

                const tagIcons = [];
                if (city.tags?.historic) tagIcons.push('<img src="assets/images/icons/icon-historic.svg" alt="Historique" class="tag-icon">');
                if (city.tags?.nightlife) tagIcons.push('<img src="assets/images/icons/icon-nightlife.svg" alt="Vie nocturne" class="tag-icon">');
                if (city.tags?.riverside) tagIcons.push('<img src="assets/images/icons/icon-riverside.svg" alt="Bord de rivière" class="tag-icon">');
                const tagsDisplay = tagIcons.length > 0 ? tagIcons.join("") : "";

                return `
                <div class="destination-card">
                    <div class="btn-destinations-container">
                        ${
                            isInItinerary
                                ? `<button class="remove-btn" data-city-id="${cityKey}"><img src="assets/images/icon-delete.svg" alt="retirer"></button>`
                                : `<button class="add-btn" data-city-id="${cityKey}"><img src="assets/images/icon-add.svg" alt="ajouter"></button>`
                        }
                    </div>
                    <div class="first-line">
                        <span class="tags midnight-green ${tagsDisplay ? "glass-effect-max" : ""}">${tagsDisplay}</span>
                    </div>
                    <img src="${city.image}" alt="${city.name}" style="width: 384px; height: 250px; object-fit: cover; border-radius: 5px;">
                    <div class="text">
                        <h3 class="h2 dark-green">${city.name}</h3>
                        <p class="midnight-green">${city.country}</p>
                    </div>
                </div>
                `;
            })
            .join("");

        container.querySelectorAll(".add-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const cityId = btn.getAttribute("data-city-id");
                const city = this.filteredDestinations.find((c) => (c._tagKey || c.name.toLowerCase().replace(/\s+/g, "-")) === cityId);
                if (city) {
                    StorageManager.addDestination(city);
                    window.dispatchEvent(new CustomEvent("itineraryUpdated"));
                    if (window.app && typeof window.app.updateMainSlider === "function") {
                        window.app.updateMainSlider();
                    }
                    this.renderDestinations();
                }
            });
        });

        container.querySelectorAll(".remove-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const cardElem = btn.closest(".destination-card");
                const cityId = btn.getAttribute("data-city-id");
                const country = cardElem?.querySelector(".midnight-green")?.textContent || "";

                let itinerary = StorageManager.getItinerary();
                itinerary = itinerary.filter((dest) => dest.id !== cityId);
                StorageManager.saveItinerary(itinerary);

                window.dispatchEvent(new CustomEvent("itineraryUpdated"));

                if (window.app && typeof window.app.updateAll === "function") {
                    window.app.updateAll();
                }
                this.renderDestinations();
            });
        });
    }
}

class TravelApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.sliders = new Map();
        this.init();
    }

    getItinerary() {
        const data = localStorage.getItem("travel_itinerary");
        return data ? JSON.parse(data) : [];
    }

    saveItinerary(itinerary) {
        localStorage.setItem("travel_itinerary", JSON.stringify(itinerary));
    }

    getCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes("choisir.html")) return "selection";
        if (path.includes("itineraire.html")) return "itinerary";
        return "home";
    }

    async init() {
        dataManager.enableWikidata();
        await dataManager.loadTravelData();
        this.initPage();
        this.setupEvents();
    }

    initPage() {
        switch (this.currentPage) {
            case "home":
                break;
            case "selection":
                this.updateItineraryDisplay();
                break;
            case "itinerary":
                this.updateItineraryDisplay();
                break;
        }
    }

    updateMainSlider() {
        const itinerary = this.getItinerary();
        const emptyState = document.getElementById("emptyState");
        const mainSliderElement = document.getElementById("mainSlider");

        console.log("Itinéraire actuel :", itinerary);
        if (itinerary.length === 0) {
            emptyState && (emptyState.style.display = "block");
            mainSliderElement && (mainSliderElement.style.display = "none");
        } else {
            emptyState && (emptyState.style.display = "none");
            mainSliderElement && (mainSliderElement.style.display = "block");
            this.sliders.get("main")?.setSlides(itinerary);
        }
    }

    updateItineraryDisplay() {
        const itinerary = this.getItinerary();
        const emptyElement = document.getElementById("emptyItinerary");

        if (itinerary.length === 0) {
            emptyElement && (emptyElement.style.display = "block");
        } else {
            emptyElement && (emptyElement.style.display = "none");
        }
    }

    setupEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("add-to-itinerary")) {
                this.addToItinerary(e.target.closest(".slide"));
            }
            if (e.target.classList.contains("remove-from-itinerary")) {
                this.removeFromItinerary(e.target.closest(".slide"));
            }
            if (e.target.classList.contains("itinerary-remove-btn")) {
                this.removeFromItineraryById(e.target.dataset.id);
            }
        });

        const clearBtn = document.getElementById("clearAllItinerary");
        clearBtn?.addEventListener("click", () => this.clearAllItinerary());

        const clearItineraryBtn = document.getElementById("clearItinerary");
        clearItineraryBtn?.addEventListener("click", () => this.clearAllItinerary());
    }

    removeFromItineraryById(id) {
        const itinerary = this.getItinerary().filter((dest) => dest.id !== id);
        this.saveItinerary(itinerary);
        this.updateAll();
    }

    addToItinerary(card) {
        const data = this.extractDestinationData(card);
        if (!data) return;

        const itinerary = this.getItinerary();
        if (!itinerary.some((dest) => dest.id === data.id)) {
            itinerary.push(data);
            this.saveItinerary(itinerary);
            this.updateAll();
        }
    }

    removeFromItinerary(card) {
        const data = this.extractDestinationData(card);
        if (!data) return;

        const itinerary = this.getItinerary().filter((dest) => dest.id !== data.id);
        this.saveItinerary(itinerary);
        this.updateAll();
    }

    updateAll() {
        this.updateItineraryDisplay();
        this.updateMainSlider();
        this.sliders.forEach((slider) => slider.updateButtonStates?.());
    }

    extractDestinationData(card) {
        const title = card.querySelector(".slide-title");
        if (!title) return null;

        return {
            id: title.textContent.toLowerCase().replace(/\s+/g, "-"),
            name: title.textContent,
            country: card.querySelector(".slide-country")?.textContent || "",
            image: card.querySelector(".slide-image")?.src || "",
        };
    }

    async showCountryDestinations(countryId) {
        const destinations = await dataManager.getDestinations(countryId);
        this.sliders.get("destinations")?.setSlides(destinations);
    }

    clearAllItinerary() {
        if (confirm("Effacer tout l'itinéraire ?")) {
            this.saveItinerary([]);
            this.updateAll();
        }
    }
}

const app = new TravelApp();
window.app = app;

let destinationChooser;
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("choisir.html")) {
        destinationChooser = new DestinationChooser();
    }
});
