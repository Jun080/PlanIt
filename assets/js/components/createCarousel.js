class CarouselCreator {
    constructor() {
        this.storage = StorageManager;
    }

    async loadCityData(carouselId) {
        try {
            const response = await fetch("assets/data/travel-data.json");
            const travelData = await response.json();
            const cityTags = travelData.cityTags;

            let cities = [];

            if (carouselId === "finalCarousel") {
                const itinerary = this.storage.getItinerary();
                cities = itinerary.map((city) => {
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
            } else {
                const rawCities = await window.getFirstCityImages(6);
                cities = rawCities.map((city) => {
                    const cityKey = city.name.toLowerCase().replace(/\s+/g, "-");
                    return {
                        ...city,
                        _tagKey: cityKey,
                    };
                });
            }

            return cities;
        } catch (err) {
            console.warn("Erreur récupération villes:", err);
        }
    }

    createSlideHTML(city, carouselId) {
        if (carouselId === "exempleCarousel") {
            return `
                <img src="${city.image}" alt="${city.name}" style="width: 384px; height: 100%; object-fit: cover; border-radius: 5px;">
                <div class="text">
                    <h3 class="h2 dark-green h2-gordon">${city.name}</h3>
                    <p class="midnight-green">${city.country}</p>
                </div>
            `;
        } else if (carouselId === "finalCarousel" && document.getElementById(carouselId)?.classList.contains("itinerary-page")) {
            const tagIcons = [];
            if (city.tags?.historic) tagIcons.push('<img src="assets/images/icons/icon-historic.svg" alt="Historique" class="tag-icon">');
            if (city.tags?.nightlife) tagIcons.push('<img src="assets/images/icons/icon-nightlife.svg" alt="Vie nocturne" class="tag-icon">');
            if (city.tags?.riverside) tagIcons.push('<img src="assets/images/icons/icon-riverside.svg" alt="Bord de rivière" class="tag-icon">');
            const tagsDisplay = tagIcons.length > 0 ? tagIcons.join("") : "";

            return `
                <div class="destination-card">
                    <div class="btn-destinations-container">
                        <button class="remove-btn" data-city-id="${city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-")}">
                            <img src="assets/images/icon-delete.svg" alt="retirer">
                        </button>
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
        } else {
            const tagIcons = [];
            if (city.tags?.historic) tagIcons.push('<img src="assets/images/icons/icon-historic.svg" alt="Historique" class="tag-icon">');
            if (city.tags?.nightlife) tagIcons.push('<img src="assets/images/icons/icon-nightlife.svg" alt="Vie nocturne" class="tag-icon">');
            if (city.tags?.riverside) tagIcons.push('<img src="assets/images/icons/icon-riverside.svg" alt="Bord de rivière" class="tag-icon">');
            const tagsDisplay = tagIcons.length > 0 ? tagIcons.join("") : "";

            return `
                <div class="text">
                    <div class="first-line">
                        <span class="tags midnight-green ${tagsDisplay ? "glass-effect" : ""}">${tagsDisplay}</span>
                        <button class="remove-btn" data-city-id="${city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-")}">
                            <img src="assets/images/icon-delete.svg" alt="retirer">
                        </button>
                    </div>
                    <h3 class="h2 dark-green" style="margin: 10px 0;">${city.name}</h3>
                    <p class="midnight-green">${city.country}</p>
                </div>
                <div class="image-container">
                    <img src="${city.image}" alt="${city.name}">
                </div>
            `;
        }
    }

    async createCarousel(carouselId) {
        const carousel = document.querySelector(`#${carouselId}`);
        if (!carousel) {
            return null;
        }

        const carouselContainer = carousel.closest(".carousel-container") || carousel.parentElement;
        const carouselTrack = carousel.querySelector(".carousel-track");

        const cities = await this.loadCityData(carouselId);

        if (cities.length === 0 && carouselId === "finalCarousel") {
            const emptyState = document.getElementById("emptyState");
            if (emptyState) {
                emptyState.style.display = "block";
            }
            return null;
        } else if (carouselId === "finalCarousel") {
            const emptyState = document.getElementById("emptyState");
            if (emptyState) {
                emptyState.style.display = "none";
            }
        }

        carouselTrack.innerHTML = "";

        cities.forEach((city) => {
            const slide = document.createElement("div");
            const isItineraryPage = carouselId === "finalCarousel" && document.getElementById(carouselId)?.classList.contains("itinairy-page");
            if (isItineraryPage) {
                slide.className = "carousel-item destination-card";
                // Structure identique à la liste
                slide.innerHTML = `
                    <div class="btn-destinations-container">
                        <button class="remove-btn" data-city-id="${city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-")}">
                            <img src="assets/images/icon-delete.svg" alt="retirer">
                        </button>
                    </div>
                    <div class="first-line">
                        <span class="tags midnight-green ${
                            city.tags && (city.tags.historic || city.tags.nightlife || city.tags.riverside) ? "glass-effect-max" : ""
                        }">
                            ${city.tags?.historic ? '<img src="assets/images/icons/icon-historic.svg" alt="Historique" class="tag-icon">' : ""}
                            ${city.tags?.nightlife ? '<img src="assets/images/icons/icon-nightlife.svg" alt="Vie nocturne" class="tag-icon">' : ""}
                            ${city.tags?.riverside ? '<img src="assets/images/icons/icon-riverside.svg" alt="Bord de rivière" class="tag-icon">' : ""}
                        </span>
                    </div>
                    <img src="${city.image}" alt="${city.name}" style="width: 384px; height: 250px; object-fit: cover; border-radius: 5px;">
                    <div class="text">
                        <h3 class="h2 dark-green">${city.name}</h3>
                        <p class="midnight-green">${city.country}</p>
                    </div>
                `;
            } else {
                slide.className = "carousel-item";
                slide.innerHTML = this.createSlideHTML(city, carouselId);
            }
            carouselTrack.appendChild(slide);
        });

        carouselTrack.addEventListener("click", (e) => {
            const addBtn = e.target.closest(".add-btn");
            const removeBtn = e.target.closest(".remove-btn");
            if (addBtn) {
                const cityId = addBtn.getAttribute("data-city-id");
                const city = cities.find((c) => c._tagKey === cityId || c.id === cityId);
                if (city) {
                    StorageManager.addDestination(city);
                    window.dispatchEvent(new CustomEvent("itineraryUpdated"));
                }
            }
            if (removeBtn) {
                const cityId = removeBtn.getAttribute("data-city-id");
                const city = cities.find((c) => c._tagKey === cityId || c.id === cityId);
                if (city) {
                    StorageManager.removeDestination(city.id, city.country);
                    window.dispatchEvent(new CustomEvent("itineraryUpdated"));
                }
            }
        });

        return {
            carousel,
            carouselContainer,
            carouselTrack,
            cities,
            carouselId,
        };
    }
}

async function createCarousel(carouselId) {
    const creator = new CarouselCreator();
    const carouselData = await creator.createCarousel(carouselId);

    const carousel = document.getElementById(carouselId);
    const emptyState = document.getElementById("emptyState");

    if (carouselId === "finalCarousel") {
        const itinerary = StorageManager.getItinerary();
        if (itinerary.length === 0) {
            if (carousel) carousel.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
        } else {
            if (carousel) carousel.style.display = "block";
            if (emptyState) emptyState.style.display = "none";
        }
    }

    if (carouselData && window.SliderManager) {
        new window.SliderManager(carouselData);
    }

    return carouselData;
}

document.addEventListener("DOMContentLoaded", async () => {
    await createCarousel("exempleCarousel");
    await createCarousel("finalCarousel");

    window.addEventListener("itineraryUpdated", async () => {
        await createCarousel("finalCarousel");
    });
});

window.CarouselCreator = CarouselCreator;
window.createCarousel = createCarousel;
