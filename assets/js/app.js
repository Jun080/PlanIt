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

            const uniqueDestinations = destinations.filter(
                (dest, index, self) => index === self.findIndex((d) => d.name === dest.name && d.country === dest.country)
            );

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
        } else if (type === "beach") {
            this.filteredDestinations = this.destinations.filter((dest) => dest.tags?.beach === true || dest.type === "beach");
        } else if (type === "mountain") {
            this.filteredDestinations = this.destinations.filter((dest) => dest.tags?.mountain === true || dest.type === "nature");
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

        container.innerHTML = this.filteredDestinations
            .map(
                (destination) => `
                <div class="destination-card" x-data="{ hovered: false }" @mouseenter="hovered = true" @mouseleave="hovered = false">
                    <div class="destination-image">
                        ${
                            destination.image
                                ? `<img src="${destination.image}" alt="${destination.name}" loading="lazy">`
                                : `<div class="placeholder-image">
                                <span>${destination.name.charAt(0)}</span>
                            </div>`
                        }
                        <div class="destination-overlay" :class="{ 'hovered': hovered }">
                            <button 
                                class="btn-add-destination" 
                                data-destination-id="${destination.id}"
                                onclick="destinationChooser.addToItinerary(${JSON.stringify(destination).replace(/"/g, "&quot;")})"
                            >
                                Ajouter à l'itinéraire
                            </button>
                        </div>
                    </div>
                    <div class="destination-info">
                        <h3>${destination.name}</h3>
                        <p class="destination-country">${destination.country}</p>
                        
                        <div class="destination-tags">
                            ${destination.tags?.beach === true ? '<span class="tag tag-beach">Plage</span>' : ""}
                            ${destination.tags?.mountain === true ? '<span class="tag tag-mountain">Montagne</span>' : ""}
                            ${destination.tags?.vibe ? `<span class="tag tag-vibe">${destination.tags.vibe}</span>` : ""}
                        </div>
                    </div>
                </div>
            `
            )
            .join("");
    }
}

class TravelApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.sliders = new Map();
        this.init();
    }

    getItinerary() {
        const data = localStorage.getItem("travel-itinerary");
        return data ? JSON.parse(data) : [];
    }

    saveItinerary(itinerary) {
        localStorage.setItem("travel-itinerary", JSON.stringify(itinerary));
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
                this.initHomeSliders();
                break;
            case "selection":
                this.initSelectionSliders();
                this.updateItineraryPreview();
                break;
            case "itinerary":
                this.initHomeSliders();
                this.updateItineraryDisplay();
                break;
        }
    }

    initHomeSliders() {
        const mainElement = document.getElementById("mainSlider");
        if (mainElement) {
            this.sliders.set("main", new SliderManager("mainSlider"));
            this.updateMainSlider();
        }

        const configs = [
            { id: "popularSlider", type: "cultural" },
            { id: "beachSlider", type: "beach" },
            { id: "culturalSlider", type: "cultural" },
        ];

        configs.forEach(async (config) => {
            const element = document.getElementById(config.id);
            if (element) {
                const slider = new SliderManager(config.id);
                this.sliders.set(config.id, slider);
                const destinations = await dataManager.getDestinationsByType(config.type);
                slider.setSlides(destinations.slice(0, 8));
            }
        });
    }

    initSelectionSliders() {
        const element = document.getElementById("destinationsSlider");
        if (element) {
            this.sliders.set("destinations", new SliderManager("destinationsSlider"));
            dataManager.getAllDestinations().then((destinations) => {
                this.sliders.get("destinations").setSlides(destinations);
            });
        }

        dataManager.getCountries().then((countries) => {
            const container = document.getElementById("countryCards");
            if (container) {
                container.innerHTML = Object.entries(countries)
                    .map(
                        ([id, country]) => `
                        <div class="country-card" data-country="${id}">
                            <h3>${country.name}</h3>
                            <button class="btn btn-primary" onclick="app.showCountryDestinations('${id}')">
                                Voir les destinations
                            </button>
                        </div>
                    `
                    )
                    .join("");
            }
        });
    }

    updateMainSlider() {
        const itinerary = this.getItinerary();
        const emptyState = document.getElementById("emptyState");
        const mainSliderElement = document.getElementById("mainSlider");

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

    updateItineraryPreview() {
        const itinerary = this.getItinerary();
        const emptyElement = document.getElementById("itineraryEmpty");
        const itemsElement = document.getElementById("itineraryItems");
        const actionsElement = document.getElementById("itineraryActions");

        if (itinerary.length === 0) {
            emptyElement && (emptyElement.style.display = "block");
            itemsElement && (itemsElement.style.display = "none");
            actionsElement && (actionsElement.style.display = "none");
        } else {
            emptyElement && (emptyElement.style.display = "none");
            itemsElement && (itemsElement.style.display = "block");
            actionsElement && (actionsElement.style.display = "flex");

            if (itemsElement) {
                itemsElement.innerHTML = `
                    <div class="itinerary-carousel">
                        <div class="carousel-track">
                            ${itinerary
                                .map(
                                    (item, index) =>
                                        `
                                            <div class="itinerary-card">
                                                <img src="${item.image}" alt="${item.name}" class="itinerary-card-image">
                                                <div class="itinerary-card-content">
                                                    <h3>${item.name}</h3>
                                                    <p class="itinerary-card-country">${item.country}</p>
                                                    <button class="itinerary-remove-btn" data-id="${item.id}">✕</button>
                                                </div>
                                            </div>
                                        `
                                )
                                .join("")}
                        </div>
                        <div class="btn-container">
                            <button class="carousel-btn carousel-btn-prev">
                                <img src="assets/images/arrow-left.svg" height="40" width="40" alt="Précédent" />
                            </button>
                            <button class="carousel-btn carousel-btn-next">
                                <img src="assets/images/arrow-right.svg" height="40" width="40" alt="Suivant" />
                            </button>
                        </div>
                    </div>
                `;

                this.initItineraryCarousel();
            }
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

    initItineraryCarousel() {
        const track = document.querySelector(".carousel-track");
        const prevBtn = document.querySelector(".carousel-btn-prev");
        const nextBtn = document.querySelector(".carousel-btn-next");

        if (!track || !prevBtn || !nextBtn) return;

        let currentIndex = 0;
        const cards = track.children;
        const visibleCards = Math.min(3, cards.length);

        const updateCarousel = () => {
            const cardWidth = 100 / visibleCards;
            const translateX = -(currentIndex * cardWidth);
            track.style.transform = `translateX(${translateX}%)`;

            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= cards.length - visibleCards;
        };

        prevBtn.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        nextBtn.addEventListener("click", () => {
            if (currentIndex < cards.length - visibleCards) {
                currentIndex++;
                updateCarousel();
            }
        });

        updateCarousel();
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
        this.updateItineraryPreview();
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

// Initialiser DestinationChooser sur la page choisir.html
let destinationChooser;
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("choisir.html")) {
        destinationChooser = new DestinationChooser();
    }
});
