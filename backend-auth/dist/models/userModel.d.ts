export declare const createUserWithVerification = "\n  INSERT INTO public.user1 (name, email, password, verification_token, verification_token_expires)\n  VALUES ($1, $2, $3, $4, $5)\n  RETURNING id, name, email, created_at\n";
export declare const getUserByEmail = "\n  SELECT * FROM public.user1 WHERE email = $1\n";
export declare const getUserByResetToken = "\n  SELECT * FROM public.user1\n  WHERE reset_token = $1 AND reset_token_expires > NOW()\n";
export declare const setResetTokenByEmail = "\n  UPDATE public.user1 SET reset_token = $1, reset_token_expires = $2\n  WHERE email = $3\n";
export declare const resetUserPassword = "\n  UPDATE public.user1\n  SET password = $1, reset_token = NULL, reset_token_expires = NULL\n  WHERE id = $2\n";
export declare const clearResetToken = "\n  UPDATE public.user1 \n  SET reset_token = NULL, reset_token_expires = NULL \n  WHERE id = $1\n";
export declare const updateVerificationToken = "\n  UPDATE public.user1\n  SET verification_token = $1,\n      verification_token_expires = $2\n  WHERE email = $3\n";
export declare const verifyUserEmail = "\n  UPDATE public.user1\n  SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL\n  WHERE verification_token = $1 AND verification_token_expires > NOW()\n";
export declare const getUserByVerificationToken = "\n  SELECT * FROM public.user1\n  WHERE verification_token = $1 AND verification_token_expires > NOW()\n";
export declare const updateUserProfile = "\n  UPDATE public.user1\n  SET name = $1, updated_at = CURRENT_TIMESTAMP\n  WHERE id = $2\n  RETURNING id, name, email, role, is_verified, created_at, updated_at\n";
export declare const changeUserPassword = "\n  UPDATE public.user1\n  SET password = $1, updated_at = CURRENT_TIMESTAMP\n  WHERE id = $2\n";
//# sourceMappingURL=userModel.d.ts.map