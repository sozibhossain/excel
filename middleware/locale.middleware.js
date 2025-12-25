import { LanguageEnum } from "../model/user.model.js";

const localeMiddleware = (req, res, next) => {
  const headerLang = req.header("x-user-language") || req.header("accept-language");
  const preferred = req.user?.language || headerLang?.split(",")?.[0]?.trim()?.toUpperCase();
  res.locals.locale = LanguageEnum.includes(preferred) ? preferred : "EN";
  next();
};

export default localeMiddleware;
