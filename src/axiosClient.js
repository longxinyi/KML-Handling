import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let res = error.response;
    if (res && res.status == 401) {
      // TODO: Handle unauthorised error
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
