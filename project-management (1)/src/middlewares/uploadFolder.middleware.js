export const setUploadFolder = (folder) => {
    return (req, res, next) => {
        req.uploadFolder = folder;
        next();
    };
};