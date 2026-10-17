import { getLastMovie } from "@/services/api";
import { MovieInfo } from "@type";

export const useLatestMovieStore = defineStore("latest-movie", () => {
  const latestMovies = ref<MovieInfo[]>([]);

  const init = async () => {
    latestMovies.value = await getLastMovie();
  };

  return {
    latestMovies,
    init,
  };
});
