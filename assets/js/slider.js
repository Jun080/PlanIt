class SliderManager {
    constructor(carouselData) {
        if (!carouselData) {
            console.warn("SliderManager: données de carousel manquantes");
            return;
        }

        this.carouselId = carouselData.carouselId;
        this.track = carouselData.carouselTrack;
        this.carouselContainer = carouselData.carouselContainer;

        this.prevBtn = this.carouselContainer.querySelector(".carousel-control-prev");
        this.nextBtn = this.carouselContainer.querySelector(".carousel-control-next");

        this.currentIndex = 0;

        if (this.prevBtn && this.nextBtn && this.track) {
            this.init();
        }
    }

    init() {
        this.prevBtn.addEventListener("click", () => this.prevSlide());
        this.nextBtn.addEventListener("click", () => this.nextSlide());

        if (this.carouselId !== "exempleCarousel") {
            this.track.addEventListener("click", (e) => {
                const removeBtn = e.target.closest(".remove-btn");
                if (removeBtn) {
                    this.handleRemoveCity(e, removeBtn);
                }
            });
        }
    }

    handleRemoveCity(e, removeBtn) {
        const cityId = removeBtn.getAttribute("data-city-id");

        const itinerary = StorageManager.getItinerary();
        const updatedItinerary = itinerary.filter((city) => {
            const cityKey = city._tagKey || city.name.toLowerCase().replace(/\s+/g, "-");
            return cityKey !== cityId;
        });

        StorageManager.saveItinerary(updatedItinerary);

        const slideElement = removeBtn.closest(".carousel-item");
        if (slideElement) {
            slideElement.remove();

            const remainingSlides = this.track.querySelectorAll(".carousel-item");
            if (this.currentIndex >= remainingSlides.length && this.currentIndex > 0) {
                this.currentIndex = remainingSlides.length - 1;
            }

            this.updateSlider();
        }

        window.dispatchEvent(new CustomEvent("itineraryUpdated", { detail: updatedItinerary }));
    }

    updateSlider() {
        const slideWidth = 387;
        const translateX = -(this.currentIndex * slideWidth);
        this.track.style.transform = `translateX(${translateX}px)`;
        this.updateNavigation();
    }

    updateNavigation() {
        if (!this.prevBtn || !this.nextBtn) return;

        const slides = this.track.querySelectorAll(".carousel-item");
    }

    nextSlide() {
        const slides = this.track.querySelectorAll(".carousel-item");
        this.currentIndex = (this.currentIndex + 1) % slides.length;
        this.updateSlider();
    }

    prevSlide() {
        const slides = this.track.querySelectorAll(".carousel-item");
        this.currentIndex = (this.currentIndex - 1 + slides.length) % slides.length;
        this.updateSlider();
    }
}

window.SliderManager = SliderManager;
