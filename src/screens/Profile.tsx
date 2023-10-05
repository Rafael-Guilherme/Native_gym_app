import { useState } from 'react';
import { Pressable } from 'react-native';
import { Center, Heading, ScrollView, Skeleton, Text, VStack, useToast } from 'native-base'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { FileInfo } from 'expo-file-system'
import * as yup from 'yup'

import { api } from '@services/api';

import { useAuth } from '@hooks/useAuth';

import defaultUserPhotoImg from '@assets/userPhotoDefault.png'

import { ScreenHeader } from '@components/ScreenHeader'
import { UserPhoto } from '@components/UserPhoto'
import Input from '@components/Input';
import Button from '@components/Button';
import { AppError } from '@utils/AppError';

const PHOTO_SIZE = 33;

type FormDataProps = {
    name: string
    email: string
    password?: string | null 
    old_password?: string 
    confirm_password?: string | null 
}

const profileSchema = yup.object({
    name: yup.string().required('Informe o nome.'),
    email: yup.string().required('Informe o e-mail').email('E-mail inválido.'),
    password: yup.string().min(6, 'A senha deve ter pelo menos 6 dígitos.').nullable().transform((value) => !!value ? value : null),
    confirm_password: yup
    .string()
    .nullable()
    .transform((value) => !!value ? value : null)
    .oneOf([yup.ref('password'), ''], 'A confirmação da senha não confere.')
    .when('password', {
        is: (field: any) => field,
        then: (schema) => schema.nullable().required('Informe a confirmação da senha.').transform((value) => !!value ? value : null)
    })
})

export function Profile() {
    const [isUpdating, setIsUpdating] = useState(false)
    const [photoIsLoading, setPhotoIsLoading] = useState(false)

    const toast = useToast()
    const { user, updateUserProfile } = useAuth()
    const { control, handleSubmit, formState: { errors } } = useForm<FormDataProps>({
        defaultValues: {
            name: user.name,
            email: user.email
        },
        resolver: yupResolver(profileSchema)
    })

    async function handleUserPhotoSelect() {
        setPhotoIsLoading(true)
        try {
            const photoSelected = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
                aspect: [4, 4],
                allowsEditing: true,
                selectionLimit: 1
            })
    
            if (photoSelected.canceled) {
                return
            }

            if (photoSelected.assets[0].uri) {
                const photoInfo = await FileSystem.getInfoAsync(photoSelected.assets[0].uri) as FileInfo

                if (photoInfo.size && (photoInfo.size / 1024 / 1024 > 5)) {
                    return  toast.show({
                        title: 'Essa imagem é muito grande. Escolha uma de até 5MB.',
                        placement: 'top',
                        bgColor: 'red.500'
                    }) 
                }

                const fileExtension = photoSelected.assets[0].uri.split('.').pop()

                const photofile = {
                    name: `${user.name}.${fileExtension}`.toLowerCase(),
                    uri: photoSelected.assets[0].uri,
                    type: `${photoSelected.assets[0].type}/${fileExtension}`
                } as any

                const userPhotoUploadForm = new FormData()
                userPhotoUploadForm.append('avatar', photofile)

                const avatarupdatedResponse = await api.patch('/users/avatar', userPhotoUploadForm, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })

                const userUpdated = user
                userUpdated.avatar = avatarupdatedResponse.data.avatar
                updateUserProfile(userUpdated)

                toast.show({
                    title: 'Foto atualizada',
                    placement: 'top',
                    bgColor: 'green.500'
                })
            }
    
        } catch (error) {
            console.log(error)
        } finally {
            setPhotoIsLoading(false)
        }
    }

    async function handleProfileUpdate(data: FormDataProps) { 
        try {
            setIsUpdating(true)

            const userUpdated = user
            userUpdated.name = data.name

            await api.put('/users', data)

            await updateUserProfile(userUpdated)

            toast.show({
                title: 'Perfil atualizado com sucesso',
                placement: 'top',
                bgColor: 'green.500'
            })

        } catch (error) {
            const isAppError = error instanceof AppError
            const title = isAppError ? error.message : 'Não foi possível atualizar o perfil. Tente novamente mais tarde'

            toast.show({
                title,
                placement: 'top',
                bgColor: 'red.500'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <VStack flex={1}>
            <ScreenHeader title='Perfil' />

            <ScrollView>
                <Center mt={6} px={10}>
                    {
                        photoIsLoading ?
                            <Skeleton
                                w={PHOTO_SIZE}
                                h={PHOTO_SIZE}
                                rounded="full"
                                startColor="gray.500"
                                endColor="gray.400"
                            />
                            :
                            <UserPhoto
                            source={
                                user.avatar 
                                ? { uri: `${api.defaults.baseURL}/avatar/${user.avatar}` } 
                                : defaultUserPhotoImg
                            }
                                alt="Foto do usuário"
                                size={PHOTO_SIZE}
                            />
                    }

                    <Pressable onPress={handleUserPhotoSelect}>
                        <Text color="green.500" fontWeight="bold" fontSize="md" mt={2} mb={8}>
                            Alterar foto
                        </Text>
                    </Pressable>

                    <Controller 
                        control={control}
                        name="name"
                        render={({ field: { value, onChange } }) => (
                            <Input 
                                placeholder='Nome'
                                bg="gray.600"
                                onChangeText={onChange}
                                value={value}
                                errorMessage={errors.name?.message}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name="email"
                        render={({ field: { value, onChange } }) => (
                            <Input 
                                placeholder='E-mail'
                                bg="gray.600"
                                isDisabled
                                onChangeText={onChange}
                                value={value}
                            />
                        )}
                    />

                </Center>

                <VStack px={10} mt={12} mb={9}>
                    <Heading color="gray.200" fontSize="md" fontFamily="heading" mb={2}>
                        Alterar senha
                    </Heading>

                    <Controller 
                        control={control}
                        name="old_password"
                        render={({ field: { onChange } }) => (
                            <Input 
                                bg="gray.600"
                                placeholder="Senha antiga"
                                secureTextEntry
                                onChangeText={onChange}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name="password"
                        render={({ field: { onChange } }) => (
                            <Input 
                                bg="gray.600"
                                placeholder="Nova senha"
                                secureTextEntry
                                onChangeText={onChange}
                                errorMessage={errors.password?.message}
                            />
                        )}
                    />

                    <Controller 
                        control={control}
                        name="confirm_password"
                        render={({ field: { onChange } }) => (
                            <Input 
                                bg="gray.600"
                                placeholder="Confirme a nova senha"
                                secureTextEntry
                                onChangeText={onChange}
                                errorMessage={errors.confirm_password?.message}
                            />
                        )}
                    />

                    <Button 
                        title='Atualizar'
                        mt={4}
                        onPress={handleSubmit(handleProfileUpdate)}
                        isLoading={isUpdating}
                    />
                </VStack>
            </ScrollView>
        </VStack>
    )
}