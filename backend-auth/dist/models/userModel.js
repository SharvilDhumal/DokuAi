"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserPassword = exports.updateUserProfile = exports.getUserByVerificationToken = exports.verifyUserEmail = exports.updateVerificationToken = exports.clearResetToken = exports.resetUserPassword = exports.setResetTokenByEmail = exports.getUserByResetToken = exports.getUserByEmail = exports.createUserWithVerification = void 0;
exports.createUserWithVerification = `
  INSERT INTO public.user1 (name, email, password, verification_token, verification_token_expires)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, name, email, created_at
`;
exports.getUserByEmail = `
  SELECT * FROM public.user1 WHERE email = $1
`;
exports.getUserByResetToken = `
  SELECT * FROM public.user1
  WHERE reset_token = $1 AND reset_token_expires > NOW()
`;
exports.setResetTokenByEmail = `
  UPDATE public.user1 SET reset_token = $1, reset_token_expires = $2
  WHERE email = $3
`;
exports.resetUserPassword = `
  UPDATE public.user1
  SET password = $1, reset_token = NULL, reset_token_expires = NULL
  WHERE id = $2
`;
exports.clearResetToken = `
  UPDATE public.user1 
  SET reset_token = NULL, reset_token_expires = NULL 
  WHERE id = $1
`;
exports.updateVerificationToken = `
  UPDATE public.user1
  SET verification_token = $1,
      verification_token_expires = $2
  WHERE email = $3
`;
exports.verifyUserEmail = `
  UPDATE public.user1
  SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL
  WHERE verification_token = $1 AND verification_token_expires > NOW()
`;
exports.getUserByVerificationToken = `
  SELECT * FROM public.user1
  WHERE verification_token = $1 AND verification_token_expires > NOW()
`;
exports.updateUserProfile = `
  UPDATE public.user1
  SET name = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING id, name, email, role, is_verified, created_at, updated_at
`;
exports.changeUserPassword = `
  UPDATE public.user1
  SET password = $1, updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
`;
//# sourceMappingURL=userModel.js.map