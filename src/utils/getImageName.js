export const getImageName = (url) => {

    const splitted = url.split("/");
    const name = splitted[splitted.length - 1];
    return name.split(".")[0]
}