import { getLastMovie } from "@/services/api";
import { MovieInfo } from "@/type";
import { proxy } from "valtio";

type LastMovieState = {
  data: MovieInfo[];
};

const createState = (): LastMovieState => {
  return {
    data: [],
  };
};

export const latestMovieState = proxy<LastMovieState>(createState());

//初始化
export const init = async () => {
  latestMovieState.data = await getLastMovie();
};
