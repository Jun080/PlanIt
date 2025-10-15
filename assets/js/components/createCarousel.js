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
                        beach: false,
                        mountain: false,
                        vibe: null,
                        neighbors: [],
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
                    <h3 class="h2 dark-green">${city.name}</h3>
                    <p class="midnight-green">${city.country}</p>
                </div>
            `;
        } else {
            const tags = [];
            if (city.tags?.beach) tags.push("beach");
            if (city.tags?.mountain) tags.push("mountain");
            const tagsDisplay = tags.length > 0 ? tags.join(" / ") : "";

            return `
                <div class="text">
                    <div class="first-line" style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="tags midnight-green ${tagsDisplay ? "glass-effect" : ""}">${tagsDisplay}</span>
                        <button class="remove-btn" style="background: none; border: none; font-size: 18px; cursor: pointer;" data-city-id="${
                            city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-")
                        }">
                            <img src="assets/images/icon-delete.svg" alt="retirer">
                        </button>
                    </div>
                    <h3 class="h2 dark-green" style="text-align: center; margin: 10px 0;">${city.name}</h3>
                    <p class="midnight-green" style="text-align: center; margin: 0;">${city.country}</p>
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
            slide.className = "carousel-item";
            slide.innerHTML = this.createSlideHTML(city, carouselId);
            carouselTrack.appendChild(slide);
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

    if (carouselData && window.SliderManager) {
        new window.SliderManager(carouselData);
    }

    return carouselData;
}

document.addEventListener("DOMContentLoaded", async () => {
    await createCarousel("exempleCarousel");
    await createCarousel("finalCarousel");
});

window.CarouselCreator = CarouselCreator;
window.createCarousel = createCarousel;
